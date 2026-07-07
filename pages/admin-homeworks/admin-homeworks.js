const {
  deleteHomeworkFromCloud,
  getClassesFromCloud,
  getHomeworkByClassFromCloud,
  isCurrentUserAdmin
} = require('../../utils/cloud-db')

Page({
  data: {
    isAdmin: false,
    classes: [],
    classIndex: 0,
    selectedClass: {},
    homeworks: []
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
          this.loadHomeworks(selectedClass.id)
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

  loadHomeworks(classId) {
    getHomeworkByClassFromCloud(classId)
      .then((homeworks) => {
        const sortedHomeworks = homeworks.sort((a, b) => {
          return new Date(b.publishTime.replace(/-/g, '/')) - new Date(a.publishTime.replace(/-/g, '/'))
        })

        this.setData({
          homeworks: sortedHomeworks
        })
      })
      .catch((error) => {
        console.error('读取作业失败', error)
        wx.showToast({
          title: '作业加载失败',
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

    this.loadHomeworks(selectedClass.id)
  },

  deleteHomework(event) {
    const homeworkId = event.currentTarget.dataset.id
    const title = event.currentTarget.dataset.title

    wx.showModal({
      title: '删除作业',
      content: `确定删除“${title}”吗？`,
      confirmText: '删除',
      confirmColor: '#d93025',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '正在删除'
        })

        deleteHomeworkFromCloud(homeworkId)
          .then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
            this.loadHomeworks(this.data.selectedClass.id)
          })
          .catch((error) => {
            console.error('删除作业失败', error)
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
