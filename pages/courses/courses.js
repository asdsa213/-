const { classes, courses, homeworks } = require('../../data/mock')
const { getLocalHomeworks } = require('../../utils/homework-storage')
const { hasStudentProfile, getStudentProfile, saveStudentProfile, normalizeStudentProfile } = require('../../utils/student-storage')
const { getCoursesByClassFromCloud, getHomeworkByClassFromCloud } = require('../../utils/cloud-db')

function belongsToClass(homework, classId) {
  if (homework.source === 'local') {
    return homework.classId === classId
  }

  return homework.classIds && homework.classIds.indexOf(classId) !== -1
}

Page({
  data: {
    courseCards: [],
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
      classIndex: this.getClassIndex(student.classes, student.classId),
      loadError: ''
    })

    this.loadCourseData(student)
  },

  getClassIndex(classes, classId) {
    const index = classes.findIndex((item) => item.id === classId)

    return index >= 0 ? index : 0
  },

  loadCourseData(student) {
    Promise.all([
      getCoursesByClassFromCloud(student.classId),
      getHomeworkByClassFromCloud(student.classId)
    ])
      .then(([cloudCourses, cloudHomeworks]) => {
        if (cloudCourses.length === 0) {
          const fallback = this.getLocalFallbackData(student.classId)

          this.setCourseCards(student, fallback.visibleCourses, cloudHomeworks.length > 0 ? cloudHomeworks : fallback.homeworks)
          return
        }

        this.setCourseCards(student, cloudCourses, cloudHomeworks)
      })
      .catch((error) => {
        console.error('课程页读取云端数据失败，已使用本地数据兜底', error)
        wx.showToast({
          title: '已使用本地数据',
          icon: 'none'
        })
        this.setData({
          loadError: '云端课程加载失败，当前显示本地兜底数据'
        })
        const fallback = this.getLocalFallbackData(student.classId)
        this.setCourseCards(student, fallback.visibleCourses, fallback.homeworks)
      })
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

    this.loadCourseData(student)
  },

  getLocalFallbackData(classId) {
    const currentClass = classes.find((item) => item.id === classId)
    const classCourseIds = currentClass ? currentClass.courseIds : []
    const visibleCourses = courses.filter((course) => classCourseIds.indexOf(course.id) !== -1)
    const localHomeworks = getLocalHomeworks()
    const allHomeworks = [
      ...localHomeworks,
      ...homeworks
    ]

    return {
      visibleCourses,
      homeworks: allHomeworks.filter((homework) => belongsToClass(homework, classId))
    }
  },

  setCourseCards(student, visibleCourses, allHomeworks) {
    const courseCards = visibleCourses.map((course) => {
      const courseId = course.id || course.courseId
      const courseHomeworks = allHomeworks
        .filter((homework) => homework.courseId === courseId)
        .sort((a, b) => new Date(b.publishTime.replace(/-/g, '/')) - new Date(a.publishTime.replace(/-/g, '/')))
      const latestHomework = courseHomeworks[0]

      return {
        ...course,
        id: courseId,
        latestHomeworkTitle: latestHomework ? latestHomework.title : '暂无作业',
        homeworkCount: courseHomeworks.length
      }
    })

    this.setData({
      student,
      courseCards
    })
  },

  goToCourse(event) {
    const id = event.currentTarget.dataset.id

    wx.navigateTo({
      url: `/pages/course-detail/course-detail?id=${id}&classId=${this.data.student.classId}&className=${this.data.student.className}`
    })
  }
})
