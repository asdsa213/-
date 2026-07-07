const { homeworks } = require('../../data/mock')
const { getLocalHomeworks } = require('../../utils/homework-storage')
const { compareDeadlineAsc, isActiveHomework, withComputedHomeworkStatus } = require('../../utils/homework-status')
const { hasStudentProfile, getStudentProfile, saveStudentProfile, normalizeStudentProfile, mergeCloudStudentWithLocalSelection } = require('../../utils/student-storage')
const { getCurrentStudentFromCloud, getHomeworkByClassFromCloud } = require('../../utils/cloud-db')

function belongsToClass(homework, classId) {
  if (homework.source === 'local') {
    return homework.classId === classId
  }

  return homework.classIds && homework.classIds.indexOf(classId) !== -1
}

Page({
  data: {
    recentHomeworks: [],
    student: null,
    classes: [],
    classIndex: 0,
    loadError: ''
  },

  onShow() {
    if (!hasStudentProfile()) {
      wx.navigateTo({
        url: '/pages/bind-student/bind-student'
      })
      return
    }

    const student = normalizeStudentProfile(getStudentProfile())
    this.setData({
      student,
      classes: student.classes,
      loadError: ''
    })

    getCurrentStudentFromCloud()
      .then((cloudStudent) => {
        const cloudProfile = cloudStudent ? {
          name: cloudStudent.name,
          studentNo: cloudStudent.studentNo,
          classId: cloudStudent.classId,
          className: cloudStudent.className,
          classes: cloudStudent.classes
        } : null
        const currentStudent = mergeCloudStudentWithLocalSelection(cloudProfile, student)

        if (cloudStudent) {
          saveStudentProfile(currentStudent)
        }

        this.setData({
          student: currentStudent,
          classes: currentStudent.classes,
          classIndex: this.getClassIndex(currentStudent.classes, currentStudent.classId)
        })

        return getHomeworkByClassFromCloud(currentStudent.classId)
          .then((cloudHomeworks) => {
            this.setHomeworkList(currentStudent, cloudHomeworks, true)
          })
      })
      .catch((error) => {
        console.error('首页读取云端作业失败，已使用本地数据兜底', error)
        wx.showToast({
          title: '已使用本地数据',
          icon: 'none'
        })
        this.setData({
          loadError: '云端作业加载失败，当前显示本地兜底数据'
        })
        this.setHomeworkList(student, this.getLocalFallbackHomeworks(student.classId), false)
      })
  },

  getClassIndex(classes, classId) {
    const index = classes.findIndex((item) => item.id === classId)

    return index >= 0 ? index : 0
  },

  onClassChange(event) {
    const classIndex = Number(event.detail.value)
    const selectedClass = this.data.classes[classIndex]
    const student = {
      ...this.data.student,
      classId: selectedClass.id,
      className: selectedClass.name
    }

    saveStudentProfile(student)
    this.setData({
      student,
      classIndex,
      loadError: ''
    })

    getHomeworkByClassFromCloud(student.classId)
      .then((cloudHomeworks) => {
        this.setHomeworkList(student, cloudHomeworks, true)
      })
      .catch((error) => {
        console.error('切换班级读取作业失败，已使用本地数据兜底', error)
        this.setData({
          loadError: '云端作业加载失败，当前显示本地兜底数据'
        })
        this.setHomeworkList(student, this.getLocalFallbackHomeworks(student.classId), false)
      })
  },

  getLocalFallbackHomeworks(classId) {
    const localHomeworks = getLocalHomeworks()
    const allHomeworks = [
      ...localHomeworks,
      ...homeworks
    ]

    return allHomeworks.filter((item) => item.status !== '已截止' && belongsToClass(item, classId))
  },

  setHomeworkList(student, homeworkList, isCloud) {
    const recentHomeworks = homeworkList
      .map(withComputedHomeworkStatus)
      .filter(isActiveHomework)
      .sort((a, b) => {
        if ((a.source === 'local' || a.source === 'cloud') && !b.source) {
          return -1
        }

        if (!a.source && (b.source === 'local' || b.source === 'cloud')) {
          return 1
        }

        return compareDeadlineAsc(a, b)
      })
      .map((item) => ({
        ...item,
        sourceText: item.source === 'cloud' ? '云端作业' : item.source === 'local' ? '本地发布' : ''
      }))

    this.setData({
      student,
      recentHomeworks
    })
  },

  goToHomework(event) {
    const id = event.currentTarget.dataset.id
    const source = event.currentTarget.dataset.source || ''

    wx.navigateTo({
      url: `/pages/homework-detail/homework-detail?id=${id}&source=${source}`
    })
  }
})
