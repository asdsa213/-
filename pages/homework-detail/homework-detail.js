const { homeworks } = require('../../data/mock')
const { deleteLocalHomework, findLocalHomework } = require('../../utils/homework-storage')
const { withComputedHomeworkStatus } = require('../../utils/homework-status')
const { deleteHomeworkFromCloud, getHomeworkByIdFromCloud, getMyCourseRepRoles, isCurrentUserAdmin, subscribeHomeworkNotice } = require('../../utils/cloud-db')

const HOMEWORK_NOTICE_TEMPLATE_ID = 'LYY32zo4dydXEjJWATtbRnDrGMa_Euq_ygm4OzDCHKs'

Page({
  data: {
    homework: {},
    canDelete: false,
    canEdit: false,
    isAdmin: false,
    repRoles: []
  },

  onLoad(options) {
    Promise.all([
      isCurrentUserAdmin(),
      getMyCourseRepRoles()
    ])
      .then(([isAdmin, repRoles]) => {
        this.setData({
          isAdmin,
          repRoles
        })

        if (this.data.homework.source) {
          this.updateActionVisible(this.data.homework)
        }
      })
      .catch((error) => {
        console.error('读取作业操作权限失败', error)
      })

    if (options.source === 'cloud') {
      wx.showLoading({
        title: '正在加载'
      })

      getHomeworkByIdFromCloud(options.id)
        .then((homework) => {
          wx.hideLoading()
          const currentHomework = withComputedHomeworkStatus(homework)

          this.setData({
            homework: currentHomework
          })
          this.updateActionVisible(currentHomework)
        })
        .catch((error) => {
          console.error('读取云端作业详情失败', error)
          wx.hideLoading()
          this.loadLocalHomework(options.id)
        })
      return
    }

    this.loadLocalHomework(options.id)
  },

  loadLocalHomework(id) {
    const localHomework = findLocalHomework(id)
    const staticHomework = homeworks.find((item) => item.id === id)
    const homework = localHomework || staticHomework || {
      title: '作业详情',
      courseName: '未找到课程',
      publishTime: '-',
      deadline: '-',
      requirement: '没有找到这条作业，请从首页或课程页重新进入。',
      note: '第一版是静态数据，不会保存真实状态。'
    }

    const currentHomework = withComputedHomeworkStatus(homework)

    this.setData({
      homework: currentHomework
    })
    this.updateActionVisible(currentHomework)
  },

  updateActionVisible(homework) {
    const isRepForHomework = this.data.repRoles.some((role) => {
      return role.classId === homework.classId && role.courseId === homework.courseId
    })

    this.setData({
      canDelete: this.data.isAdmin && (homework.source === 'local' || homework.source === 'cloud'),
      canEdit: (this.data.isAdmin || isRepForHomework) && homework.source === 'cloud'
    })
  },

  markKnown() {
    wx.showModal({
      title: '已标记为知晓',
      content: '是否开启后续作业提醒？开启后，下次发布作业时会通过微信服务通知提醒你。',
      cancelText: '暂不开启',
      confirmText: '开启提醒',
      success: (res) => {
        if (!res.confirm) {
          wx.showToast({
            title: '已知晓',
            icon: 'success'
          })
          return
        }

        this.requestHomeworkNotice()
      }
    })
  },

  requestHomeworkNotice() {
    wx.requestSubscribeMessage({
      tmplIds: [HOMEWORK_NOTICE_TEMPLATE_ID],
      success: (res) => {
        if (res[HOMEWORK_NOTICE_TEMPLATE_ID] !== 'accept') {
          wx.showToast({
            title: '未开启提醒',
            icon: 'none'
          })
          return
        }

        wx.showLoading({
          title: '正在开启'
        })

        subscribeHomeworkNotice()
          .then(() => {
            wx.hideLoading()
            wx.showToast({
              title: '已开启提醒',
              icon: 'success'
            })
          })
          .catch((error) => {
            console.error('保存订阅提醒状态失败', error)
            wx.hideLoading()
            wx.showToast({
              title: error.message || '开启失败',
              icon: 'none'
            })
          })
      },
      fail: (error) => {
        console.error('请求订阅消息授权失败', error)
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        })
      }
    })
  },

  editHomework() {
    const homework = this.data.homework

    if (!this.data.canEdit) {
      wx.showToast({
        title: '暂无修改权限',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/admin-publish/admin-publish?id=${homework.id}`
    })
  },

  deleteHomework() {
    const homework = this.data.homework
    const isCloudHomework = homework.source === 'cloud'

    if (!this.data.isAdmin) {
      wx.showToast({
        title: '暂无管理员权限',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '删除作业',
      content: `确定要删除这条${isCloudHomework ? '云端' : '本地'}作业吗？`,
      confirmText: '删除',
      confirmColor: '#d93025',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        if (isCloudHomework) {
          this.deleteCloudHomework(homework.id)
          return
        }

        this.deleteLocalHomework(homework.id)
      }
    })
  },

  deleteLocalHomework(id) {
    deleteLocalHomework(id)

    this.afterDeleteSuccess()
  },

  deleteCloudHomework(id) {
    wx.showLoading({
      title: '正在删除'
    })

    deleteHomeworkFromCloud(id)
      .then(() => {
        wx.hideLoading()
        this.afterDeleteSuccess()
      })
      .catch((error) => {
        console.error('删除云端作业失败', error)
        wx.hideLoading()

        wx.showToast({
          title: '删除失败',
          icon: 'none'
        })
      })
  },

  afterDeleteSuccess() {
    wx.showToast({
      title: '已删除',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 600)
  }
})
