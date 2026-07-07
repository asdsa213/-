const { createClassToCloud, deleteClassFromCloud, getClassesFromCloud, isCurrentUserAdmin } = require('../../utils/cloud-db')

Page({
  data: {
    classId: '',
    name: '',
    isAdmin: false,
    classes: []
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
        this.setData({
          classes
        })
      })
      .catch((error) => {
        console.error('读取班级列表失败', error)
        wx.showToast({
          title: '班级列表加载失败',
          icon: 'none'
        })
      })
  },

  onClassIdInput(event) {
    this.setData({
      classId: event.detail.value
    })
  },

  onNameInput(event) {
    this.setData({
      name: event.detail.value
    })
  },

  saveClass() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '暂无管理员权限',
        icon: 'none'
      })
      return
    }

    const classId = this.data.classId.trim()
    const name = this.data.name.trim()

    if (!classId || !name) {
      wx.showToast({
        title: '请填写班级信息',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在保存'
    })

    createClassToCloud({
      classId,
      name
    })
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        this.setData({
          classId: '',
          name: ''
        })

        this.loadClasses()
      })
      .catch((error) => {
        console.error('添加班级失败', error)
        wx.hideLoading()
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        })
      })
  },

  deleteClass(event) {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '暂无管理员权限',
        icon: 'none'
      })
      return
    }

    const classId = event.currentTarget.dataset.id
    const name = event.currentTarget.dataset.name

    wx.showModal({
      title: '删除班级',
      content: `确定删除“${name}”吗？这会同时删除这个班级的课程关联，不会自动删除已发布作业。`,
      confirmText: '删除',
      confirmColor: '#d93025',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '正在删除'
        })

        deleteClassFromCloud(classId)
          .then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
            this.loadClasses()
          })
          .catch((error) => {
            console.error('删除班级失败', error)
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
