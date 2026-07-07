const { classes } = require('../../data/mock')
const { getStudentProfile, saveStudentProfile } = require('../../utils/student-storage')
const { getClassesFromCloud, saveStudentToCloud } = require('../../utils/cloud-db')

Page({
  data: {
    classes,
    classIndex: 0,
    selectedClass: classes[0],
    name: '',
    studentNo: '',
    agreed: false
  },

  onLoad() {
    const profile = getStudentProfile()
    this.loadClasses(profile)
  },

  loadClasses(profile) {
    getClassesFromCloud()
      .then((cloudClasses) => {
        const nextClasses = cloudClasses.length > 0 ? cloudClasses : classes
        const classIndex = profile ? nextClasses.findIndex((item) => item.id === profile.classId) : 0
        const safeClassIndex = classIndex >= 0 ? classIndex : 0

        this.setData({
          classes: nextClasses,
          classIndex: safeClassIndex,
          selectedClass: nextClasses[safeClassIndex],
          name: profile ? profile.name || '' : '',
          studentNo: profile ? profile.studentNo || '' : ''
        })
      })
      .catch((error) => {
        console.error('读取云端班级失败，已使用本地班级', error)
        const classIndex = profile ? classes.findIndex((item) => item.id === profile.classId) : 0
        const safeClassIndex = classIndex >= 0 ? classIndex : 0

        this.setData({
          classes,
          classIndex: safeClassIndex,
          selectedClass: classes[safeClassIndex],
          name: profile ? profile.name || '' : '',
          studentNo: profile ? profile.studentNo || '' : ''
        })
      })
  },

  onNameInput(event) {
    this.setData({
      name: event.detail.value
    })
  },

  onStudentNoInput(event) {
    this.setData({
      studentNo: event.detail.value
    })
  },

  onClassChange(event) {
    const classIndex = Number(event.detail.value)

    this.setData({
      classIndex,
      selectedClass: this.data.classes[classIndex]
    })
  },

  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  goToUserAgreement() {
    wx.navigateTo({
      url: '/pages/user-agreement/user-agreement'
    })
  },

  goToPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy-policy/privacy-policy'
    })
  },

  saveProfile() {
    const name = this.data.name.trim()
    const studentNo = this.data.studentNo.trim()
    const selectedClass = this.data.selectedClass

    if (!name || !studentNo) {
      wx.showToast({
        title: '请填写姓名和学号',
        icon: 'none'
      })
      return
    }

    if (!this.data.agreed) {
      wx.showToast({
        title: '请先阅读并同意用户服务协议和隐私政策',
        icon: 'none'
      })
      return
    }

    const oldProfile = getStudentProfile()
    const oldClasses = oldProfile && oldProfile.classes && oldProfile.classes.length > 0 ? oldProfile.classes : []
    const nextClasses = oldClasses
      .concat({
        id: selectedClass.id,
        name: selectedClass.name
      })
      .filter((item, index, array) => array.findIndex((classItem) => classItem.id === item.id) === index)

    const profile = {
      name,
      studentNo,
      classId: selectedClass.id,
      className: selectedClass.name,
      classes: nextClasses
    }

    saveStudentProfile(profile)

    wx.showLoading({
      title: '正在保存'
    })

    saveStudentToCloud(profile)
      .then(() => {
        wx.hideLoading()

        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        setTimeout(() => {
          const pages = getCurrentPages()

          if (pages.length > 1) {
            wx.navigateBack()
            return
          }

          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 600)
      })
      .catch((error) => {
        console.error('保存学生信息到云数据库失败', error)
        wx.hideLoading()

        wx.showToast({
          title: '云端保存失败',
          icon: 'none'
        })
      })
  }
})
