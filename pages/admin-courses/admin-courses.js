const {
  createCourseToCloud,
  deleteCourseFromCloud,
  getClassesFromCloud,
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
    courseId: '',
    name: '',
    teacher: ''
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
        this.setData({
          courses: courses.map((course) => ({
            ...course,
            id: course.courseId || course.id
          }))
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

  onClassChange(event) {
    const classIndex = Number(event.detail.value)
    const selectedClass = this.data.classes[classIndex]

    this.setData({
      classIndex,
      selectedClass
    })

    this.loadCourses(selectedClass.id)
  },

  onCourseIdInput(event) {
    this.setData({
      courseId: event.detail.value
    })
  },

  onNameInput(event) {
    this.setData({
      name: event.detail.value
    })
  },

  onTeacherInput(event) {
    this.setData({
      teacher: event.detail.value
    })
  },

  saveCourse() {
    const selectedClass = this.data.selectedClass
    const courseId = this.data.courseId.trim()
    const name = this.data.name.trim()
    const teacher = this.data.teacher.trim()

    if (!selectedClass.id) {
      wx.showToast({
        title: '请先添加班级',
        icon: 'none'
      })
      return
    }

    if (!courseId || !name) {
      wx.showToast({
        title: '请填写课程信息',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在保存'
    })

    createCourseToCloud({
      classId: selectedClass.id,
      courseId,
      name,
      teacher
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        this.setData({
          courseId: '',
          name: '',
          teacher: ''
        })
        this.loadCourses(selectedClass.id)
      })
      .catch((error) => {
        console.error('添加课程失败', error)
        wx.hideLoading()
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        })
      })
  },

  deleteCourse(event) {
    const selectedClass = this.data.selectedClass
    const courseId = event.currentTarget.dataset.id
    const name = event.currentTarget.dataset.name

    wx.showModal({
      title: '删除课程',
      content: `确定从“${selectedClass.name}”删除“${name}”吗？不会自动删除该课程下已有作业。`,
      confirmText: '删除',
      confirmColor: '#d93025',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '正在删除'
        })

        deleteCourseFromCloud(courseId, selectedClass.id)
          .then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
            this.loadCourses(selectedClass.id)
          })
          .catch((error) => {
            console.error('删除课程失败', error)
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
