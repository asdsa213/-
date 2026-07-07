const { classes, courses: localCourses, homeworks } = require('../../data/mock')
const { getStudentProfile, saveStudentProfile, normalizeStudentProfile, mergeCloudStudentWithLocalSelection } = require('../../utils/student-storage')
const {
  getClassMembersFromCloud,
  getCurrentStudentFromCloud,
  getCoursesByClassFromCloud,
  getHomeworkByClassFromCloud,
  getMyCourseRepRoles,
  isCurrentUserAdmin,
  leaveClassFromCloud
} = require('../../utils/cloud-db')

function getCourseId(course) {
  return course.id || course.courseId
}

Page({
  data: {
    student: {},
    classes: [],
    classIndex: 0,
    members: [],
    canViewMembers: false,
    isAdmin: false,
    repRoles: [],
    courses: [],
    courseCount: 0,
    homeworkCount: 0,
    loadError: ''
  },

  onShow() {
    Promise.all([
      getCurrentStudentFromCloud(),
      isCurrentUserAdmin(),
      getMyCourseRepRoles()
    ])
      .then(([cloudProfile, isAdmin, repRoles]) => {
        const student = mergeCloudStudentWithLocalSelection(cloudProfile, getStudentProfile())

        if (!student) {
          wx.navigateTo({
            url: '/pages/bind-student/bind-student'
          })
          return
        }

        saveStudentProfile({
          name: student.name,
          studentNo: student.studentNo,
          classId: student.classId,
          className: student.className,
          classes: student.classes
        })

        this.setData({
          student,
          classes: student.classes,
          classIndex: this.getClassIndex(student.classes, student.classId),
          isAdmin,
          repRoles,
          canViewMembers: this.canViewClassMembers(student.classId, isAdmin, repRoles),
          loadError: ''
        })

        this.loadClassData(student)
      })
      .catch((error) => {
        console.error('我的班级读取学生信息失败', error)
        const student = normalizeStudentProfile(getStudentProfile())

        if (!student) {
          wx.navigateTo({
            url: '/pages/bind-student/bind-student'
          })
          return
        }

        this.setData({
          student,
          classes: student.classes,
          classIndex: this.getClassIndex(student.classes, student.classId),
          canViewMembers: false,
          loadError: '云端信息加载失败，当前显示本地缓存'
        })
        this.loadLocalClassData(student)
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
      canViewMembers: this.canViewClassMembers(student.classId, this.data.isAdmin, this.data.repRoles),
      loadError: ''
    })

    this.loadClassData(student)
  },

  canViewClassMembers(classId, isAdmin, repRoles) {
    return isAdmin || repRoles.some((role) => role.classId === classId)
  },

  loadClassData(student) {
    const membersPromise = this.data.canViewMembers ? getClassMembersFromCloud(student.classId) : Promise.resolve([])

    Promise.all([
      getCoursesByClassFromCloud(student.classId),
      getHomeworkByClassFromCloud(student.classId),
      membersPromise
    ])
      .then(([cloudCourses, cloudHomeworks, members]) => {
        if (cloudCourses.length === 0) {
          this.loadLocalClassData(student, cloudHomeworks.length)
          this.setData({
            members
          })
          return
        }

        this.setData({
          courses: cloudCourses.map((course) => ({
            ...course,
            id: getCourseId(course)
          })),
          courseCount: cloudCourses.length,
          homeworkCount: cloudHomeworks.length,
          members
        })
      })
      .catch((error) => {
        console.error('我的班级读取云端班级数据失败', error)
        this.setData({
          loadError: '云端班级数据加载失败，当前显示本地兜底数据'
        })
        this.loadLocalClassData(student)
      })
  },

  loadLocalClassData(student, cloudHomeworkCount) {
    const currentClass = classes.find((item) => item.id === student.classId)
    const courseIds = currentClass ? currentClass.courseIds : []
    const visibleCourses = localCourses.filter((course) => courseIds.indexOf(course.id) !== -1)
    const visibleHomeworks = homeworks.filter((homework) => homework.classIds && homework.classIds.indexOf(student.classId) !== -1)

    this.setData({
      courses: visibleCourses,
      courseCount: visibleCourses.length,
      homeworkCount: typeof cloudHomeworkCount === 'number' ? cloudHomeworkCount : visibleHomeworks.length
    })
  },

  leaveCurrentClass() {
    const student = this.data.student

    wx.showModal({
      title: '退出班级',
      content: `确定退出“${student.className}”吗？退出后将不再显示该班级的课程和作业。`,
      confirmText: '退出',
      confirmColor: '#d93025',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        wx.showLoading({
          title: '正在退出'
        })

        leaveClassFromCloud(student.classId)
          .then((result) => {
            wx.hideLoading()
            wx.showToast({
              title: '已退出',
              icon: 'success'
            })

            if (!result.student) {
              wx.removeStorageSync('student_profile')
              setTimeout(() => {
                wx.navigateTo({
                  url: '/pages/bind-student/bind-student'
                })
              }, 600)
              return
            }

            saveStudentProfile(result.student)
            this.setData({
              student: result.student,
              classes: result.student.classes,
              classIndex: this.getClassIndex(result.student.classes, result.student.classId)
            })
            this.loadClassData(result.student)
          })
          .catch((error) => {
            console.error('退出班级失败', error)
            wx.hideLoading()
            wx.showToast({
              title: error.message || '退出失败',
              icon: 'none'
            })
          })
      }
    })
  }
})
