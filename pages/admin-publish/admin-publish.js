const { classes, courses } = require('../../data/mock')
const { saveLocalHomework } = require('../../utils/homework-storage')
const {
  getClassesFromCloud,
  getCoursesByClassFromCloud,
  getHomeworkByIdFromCloud,
  getMyCourseRepRoles,
  isCurrentUserAdmin,
  saveHomeworkToCloud,
  updateHomeworkToCloud
} = require('../../utils/cloud-db')

function getCoursesByClass(classInfo) {
  if (!classInfo.courseIds || classInfo.courseIds.length === 0) {
    return courses
  }

  return courses.filter((course) => classInfo.courseIds.indexOf(course.id) !== -1)
}

function padNumber(number) {
  return number < 10 ? `0${number}` : `${number}`
}

function formatDateTime(date) {
  const year = date.getFullYear()
  const month = padNumber(date.getMonth() + 1)
  const day = padNumber(date.getDate())
  const hour = padNumber(date.getHours())
  const minute = padNumber(date.getMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = padNumber(date.getMonth() + 1)
  const day = padNumber(date.getDate())

  return `${year}-${month}-${day}`
}

function getDefaultDeadlineDate() {
  const date = new Date()

  date.setDate(date.getDate() + 7)

  return formatDate(date)
}

Page({
  data: {
    classes,
    classIndex: 0,
    selectedClass: classes[0],
    courses: getCoursesByClass(classes[0]),
    courseIndex: 0,
    selectedCourse: getCoursesByClass(classes[0])[0],
    title: '',
    requirement: '',
    deadlineDate: getDefaultDeadlineDate(),
    deadlineTime: '18:00',
    note: '',
    isAdmin: false,
    repRoles: [],
    canPublish: false,
    editId: '',
    pageTitle: '发布作业',
    saveButtonText: '保存作业'
  },

  onLoad(options) {
    const editId = options.id || ''

    this.setData({
      editId,
      pageTitle: editId ? '修改作业' : '发布作业',
      saveButtonText: editId ? '保存修改' : '保存作业'
    })

    Promise.all([
      isCurrentUserAdmin(),
      getMyCourseRepRoles()
    ])
      .then(([isAdmin, repRoles]) => {
        const canPublish = isAdmin || repRoles.length > 0

        this.setData({
          isAdmin,
          repRoles,
          canPublish
        })

        if (!canPublish) {
          wx.showToast({
            title: '暂无发布权限',
            icon: 'none'
          })

          setTimeout(() => {
            wx.navigateBack()
          }, 600)
          return
        }

        if (editId) {
          this.loadEditHomework(editId)
          return
        }

        this.loadClasses()
      })
      .catch((error) => {
        console.error('读取发布权限失败', error)
        wx.showToast({
          title: '权限检查失败',
          icon: 'none'
        })
      })
  },

  loadClasses() {
    if (!this.data.isAdmin) {
      const repClasses = this.data.repRoles.map((role) => ({
        id: role.classId,
        name: role.className,
        courseIds: []
      }))
      const uniqueClasses = repClasses.filter((item, index, array) => {
        return array.findIndex((classItem) => classItem.id === item.id) === index
      })
      const selectedClass = uniqueClasses[0]

      this.setData({
        classes: uniqueClasses,
        classIndex: 0,
        selectedClass
      })

      this.loadCoursesForClass(selectedClass)
      return
    }

    getClassesFromCloud()
      .then((cloudClasses) => {
        const nextClasses = cloudClasses.length > 0 ? cloudClasses : classes
        const selectedClass = nextClasses[0]

        this.setData({
          classes: nextClasses,
          classIndex: 0,
          selectedClass
        })

        this.loadCoursesForClass(selectedClass)
      })
      .catch((error) => {
        console.error('发布页读取云端班级失败，已使用本地班级', error)
        const selectedClass = classes[0]

        this.setData({
          classes,
          classIndex: 0,
          selectedClass
        })

        this.loadCoursesForClass(selectedClass)
      })
  },

  loadCoursesForClass(selectedClass) {
    if (!this.data.isAdmin) {
      const nextCourses = this.data.repRoles
        .filter((role) => role.classId === selectedClass.id)
        .map((role) => ({
          id: role.courseId,
          name: role.courseName,
          teacher: role.teacher || ''
        }))

      this.setData({
        courses: nextCourses,
        courseIndex: 0,
        selectedCourse: nextCourses[0]
      })
      return
    }

    getCoursesByClassFromCloud(selectedClass.id)
      .then((cloudCourses) => {
        const nextCourses = cloudCourses.length > 0 ? cloudCourses.map((course) => ({
          id: course.courseId,
          name: course.name,
          teacher: course.teacher
        })) : getCoursesByClass(selectedClass)

        this.setData({
          courses: nextCourses,
          courseIndex: 0,
          selectedCourse: nextCourses[0]
        })
      })
      .catch((error) => {
        console.error('发布页读取云端课程失败，已使用本地课程', error)
        const nextCourses = getCoursesByClass(selectedClass)

        this.setData({
          courses: nextCourses,
          courseIndex: 0,
          selectedCourse: nextCourses[0]
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

    this.loadCoursesForClass(selectedClass)
  },

  onCourseChange(event) {
    const courseIndex = Number(event.detail.value)

    this.setData({
      courseIndex,
      selectedCourse: this.data.courses[courseIndex]
    })
  },

  onTitleInput(event) {
    this.setData({
      title: event.detail.value
    })
  },

  onRequirementInput(event) {
    this.setData({
      requirement: event.detail.value
    })
  },

  onDeadlineDateChange(event) {
    this.setData({
      deadlineDate: event.detail.value
    })
  },

  onDeadlineTimeChange(event) {
    this.setData({
      deadlineTime: event.detail.value
    })
  },

  onNoteInput(event) {
    this.setData({
      note: event.detail.value
    })
  },

  saveHomework() {
    if (!this.data.canPublish) {
      wx.showToast({
        title: '暂无发布权限',
        icon: 'none'
      })
      return
    }

    const title = this.data.title.trim()
    const requirement = this.data.requirement.trim()
    const deadline = `${this.data.deadlineDate} ${this.data.deadlineTime}`
    const note = this.data.note.trim()

    if (!title || !requirement) {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
      return
    }

    const course = this.data.selectedCourse
    const selectedClass = this.data.selectedClass
    if (!course) {
      wx.showToast({
        title: '请先选择课程',
        icon: 'none'
      })
      return
    }

    if (this.data.editId) {
      this.updateHomework({
        title,
        deadline,
        requirement,
        note: note || '无',
        status: '进行中'
      })
      return
    }

    const now = Date.now()
    const homework = {
      id: `local-${now}`,
      source: 'local',
      classId: selectedClass.id,
      className: selectedClass.name,
      courseId: course.id || course.courseId,
      courseName: course.name,
      title,
      publishTime: formatDateTime(new Date(now)),
      deadline,
      summary: requirement.length > 28 ? `${requirement.slice(0, 28)}...` : requirement,
      requirement,
      note: note || '无',
      status: '进行中'
    }

    if (this.data.isAdmin) {
      saveLocalHomework(homework)
    }

    wx.showLoading({
      title: '正在发布'
    })

    saveHomeworkToCloud(homework)
      .then(() => {
        wx.hideLoading()

        wx.showToast({
          title: '发布成功，已尝试提醒',
          icon: 'success'
        })

        this.resetForm()
      })
      .catch((error) => {
        console.error('发布作业到云数据库失败，已保存到本地缓存', error)
        wx.hideLoading()

        wx.showToast({
          title: this.data.isAdmin ? '已先存本地' : '发布失败',
          icon: 'none'
        })

        this.resetForm()
      })
  },

  loadEditHomework(id) {
    wx.showLoading({
      title: '正在加载'
    })

    getHomeworkByIdFromCloud(id)
      .then((homework) => {
        wx.hideLoading()

        const canEdit = this.data.isAdmin || this.data.repRoles.some((role) => {
          return role.classId === homework.classId && role.courseId === homework.courseId
        })

        if (!canEdit) {
          wx.showToast({
            title: '暂无修改权限',
            icon: 'none'
          })

          setTimeout(() => {
            wx.navigateBack()
          }, 600)
          return
        }

        const selectedClass = {
          id: homework.classId,
          name: homework.className,
          courseIds: []
        }
        const selectedCourse = {
          id: homework.courseId,
          name: homework.courseName
        }
        const deadlineParts = homework.deadline.split(' ')

        this.setData({
          classes: [selectedClass],
          classIndex: 0,
          selectedClass,
          courses: [selectedCourse],
          courseIndex: 0,
          selectedCourse,
          title: homework.title,
          requirement: homework.requirement,
          deadlineDate: deadlineParts[0] || getDefaultDeadlineDate(),
          deadlineTime: deadlineParts[1] || '18:00',
          note: homework.note === '无' ? '' : homework.note
        })
      })
      .catch((error) => {
        console.error('读取待修改作业失败', error)
        wx.hideLoading()
        wx.showToast({
          title: '作业加载失败',
          icon: 'none'
        })
      })
  },

  updateHomework(homework) {
    wx.showLoading({
      title: '正在保存'
    })

    updateHomeworkToCloud(this.data.editId, homework)
      .then(() => {
        wx.hideLoading()
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 600)
      })
      .catch((error) => {
        console.error('修改作业失败', error)
        wx.hideLoading()
        wx.showToast({
          title: error.message || '修改失败',
          icon: 'none'
        })
      })
  },

  resetForm() {
    this.setData({
      title: '',
      requirement: '',
      deadlineDate: getDefaultDeadlineDate(),
      deadlineTime: '18:00',
      note: ''
    })
  }
})
