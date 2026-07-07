const {
  createCourseRepToCloud,
  deleteCourseRepFromCloud,
  getClassesFromCloud,
  getCourseRepsFromCloud,
  getCoursesByClassFromCloud,
  isCurrentUserAdmin
} = require('../../utils/cloud-db')

Page({
  data: {
    isAdmin: false,
    classes: [],
    classIndex: 0,
    selectedClass: {},
    courses: [],
    courseIndex: 0,
    selectedCourse: {},
    studentNo: '',
    reps: []
  },

  onLoad() {
    isCurrentUserAdmin()
      .then((isAdmin) => {
        this.setData({
          isAdmin
        })

        if (!isAdmin) {
          wx.showToast({
            title: '暂无管理员权限',
            icon: 'none'
          })

          setTimeout(() => {
            wx.navigateBack()
          }, 600)
          return
        }

        this.loadClasses()
        this.loadReps()
      })
      .catch((error) => {
        console.error('读取管理员权限失败', error)
        wx.showToast({
          title: '权限检查失败',
          icon: 'none'
        })
      })
  },

  loadClasses() {
    getClassesFromCloud()
      .then((classes) => {
        const selectedClass = classes[0] || {}

        this.setData({
          classes,
          classIndex: 0,
          selectedClass
        })

        if (selectedClass.id) {
          this.loadCourses(selectedClass.id)
        }
      })
      .catch((error) => {
        console.error('读取班级失败', error)
        wx.showToast({
          title: '班级加载失败',
          icon: 'none'
        })
      })
  },

  loadCourses(classId) {
    getCoursesByClassFromCloud(classId)
      .then((courses) => {
        const nextCourses = courses.map((course) => ({
          id: course.courseId || course.id,
          name: course.name,
          teacher: course.teacher
        }))

        this.setData({
          courses: nextCourses,
          courseIndex: 0,
          selectedCourse: nextCourses[0] || {}
        })
      })
      .catch((error) => {
        console.error('读取课程失败', error)
        wx.showToast({
          title: '课程加载失败',
          icon: 'none'
        })
      })
  },

  loadReps() {
    getCourseRepsFromCloud()
      .then((reps) => {
        this.setData({
          reps
        })
      })
      .catch((error) => {
        console.error('读取课代表失败', error)
        wx.showToast({
          title: '课代表加载失败',
          icon: 'none'
        })
      })
  },

  onClassChange(event) {
    const classIndex = Number(event.detail.value)
    const selectedClass = this.data.classes[classIndex]

    this.setData({
      classIndex,
      selectedClass
    })

    this.loadCourses(selectedClass.id)
  },

  onCourseChange(event) {
    const courseIndex = Number(event.detail.value)

    this.setData({
      courseIndex,
      selectedCourse: this.data.courses[courseIndex]
    })
  },

  onStudentNoInput(event) {
    this.setData({
      studentNo: event.detail.value
    })
  },

  saveRep() {
    const selectedClass = this.data.selectedClass
    const selectedCourse = this.data.selectedCourse
    const studentNo = this.data.studentNo.trim()

    if (!selectedClass.id || !selectedCourse.id) {
      wx.showToast({
        title: '请先选择班级和课程',
        icon: 'none'
      })
      return
    }

    if (!studentNo) {
      wx.showToast({
        title: '请填写学生学号',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在保存'
    })

    createCourseRepToCloud({
      classId: selectedClass.id,
      className: selectedClass.name,
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      studentNo
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        this.setData({
          studentNo: ''
        })
        this.loadReps()
      })
      .catch((error) => {
        console.error('添加课代表失败', error)
        wx.hideLoading()
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        })
      })
  },

  deleteRep(event) {
    const repId = event.currentTarget.dataset.id
    const name = event.currentTarget.dataset.name

    wx.showModal({
      title: '删除课代表',
      content: `确定取消“${name}”的课代表权限吗？`,
      confirmText: '删除',
      confirmColor: '#d93025',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '正在删除'
        })

        deleteCourseRepFromCloud(repId)
          .then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
            this.loadReps()
          })
          .catch((error) => {
            console.error('删除课代表失败', error)
            wx.hideLoading()
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            })
          })
      }
    })
  }
})
