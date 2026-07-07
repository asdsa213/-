const { courses, homeworks } = require('../../data/mock')
const { getLocalHomeworks } = require('../../utils/homework-storage')
const { withComputedHomeworkStatus } = require('../../utils/homework-status')
const { hasStudentProfile, getStudentProfile } = require('../../utils/student-storage')
const { getCourseByIdFromCloud, getHomeworkByClassAndCourseFromCloud } = require('../../utils/cloud-db')

function belongsToClass(homework, classId) {
  if (homework.source === 'local') {
    return homework.classId === classId
  }

  return homework.classIds && homework.classIds.indexOf(classId) !== -1
}

Page({
  data: {
    course: {},
    courseHomeworks: [],
    hasHomeworks: false,
    courseId: '',
    classId: '',
    className: ''
  },

  onLoad(options) {
    const courseId = options.id

    this.setData({
      courseId,
      classId: options.classId || '',
      className: options.className || ''
    })
  },

  onShow() {
    if (!hasStudentProfile()) {
      wx.navigateTo({
        url: '/pages/bind-student/bind-student'
      })
      return
    }

    const courseId = this.data.courseId
    const student = getStudentProfile()
    const classId = this.data.classId || student.classId

    Promise.all([
      getCourseByIdFromCloud(courseId),
      getHomeworkByClassAndCourseFromCloud(classId, courseId)
    ])
      .then(([cloudCourse, cloudHomeworks]) => {
        this.setCourseHistory(cloudCourse || this.getLocalCourse(courseId), cloudHomeworks)
      })
      .catch((error) => {
        console.error('课程历史页读取云端数据失败，已使用本地数据兜底', error)
        this.setCourseHistory(
          this.getLocalCourse(courseId),
          this.getLocalFallbackHomeworks(classId, courseId)
        )
      })
  },

  getLocalCourse(courseId) {
    return courses.find((item) => item.id === courseId || item.courseId === courseId) || {
      name: '课程历史',
      teacher: '暂无'
    }
  },

  getLocalFallbackHomeworks(classId, courseId) {
    const localHomeworks = getLocalHomeworks()
    const allHomeworks = [
      ...localHomeworks,
      ...homeworks
    ]

    return allHomeworks.filter((item) => item.courseId === courseId && belongsToClass(item, classId))
  },

  setCourseHistory(course, homeworkList) {
    const normalizedCourse = {
      id: course.id || course.courseId,
      name: course.name,
      teacher: course.teacher
    }
    const courseHomeworks = homeworkList
      .sort((a, b) => {
        if ((a.source === 'local' || a.source === 'cloud') && !b.source) {
          return -1
        }

        if (!a.source && (b.source === 'local' || b.source === 'cloud')) {
          return 1
        }

        return new Date(b.publishTime.replace(/-/g, '/')) - new Date(a.publishTime.replace(/-/g, '/'))
      })
      .map((item) => ({
        ...withComputedHomeworkStatus(item),
        sourceText: item.source === 'cloud' ? '云端作业' : item.source === 'local' ? '本地发布' : ''
      }))

    this.setData({
      course: normalizedCourse,
      courseHomeworks,
      hasHomeworks: courseHomeworks.length > 0
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
