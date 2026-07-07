const db = wx.cloud.database()

const COLLECTIONS = {
  students: 'students',
  classes: 'classes',
  courses: 'courses',
  classCourses: 'class_courses',
  homework: 'homework',
  admins: 'admins',
  courseReps: 'course_reps'
}

function getNow() {
  return db.serverDate()
}

function getCurrentOpenid() {
  return wx.cloud.callFunction({
    name: 'getOpenId'
  }).then((res) => res.result.openid)
}

function getCurrentStudentFromCloud() {
  return wx.cloud.callFunction({
    name: 'getMyStudentInfo'
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return null
    }

    return res.result.student
  })
}

function saveStudentToCloud(profile) {
  return wx.cloud.callFunction({
    name: 'saveMyStudentInfo',
    data: {
      profile
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '保存学生信息失败'))
    }

    return res.result
  })
}

function deleteMyStudentInfoFromCloud() {
  return wx.cloud.callFunction({
    name: 'deleteMyStudentInfo'
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '删除绑定信息失败'))
    }

    return res.result
  })
}

function getClassMembersFromCloud(classId) {
  return wx.cloud.callFunction({
    name: 'getClassMembers',
    data: {
      classId
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '读取班级成员失败'))
    }

    return res.result.members || []
  })
}

function leaveClassFromCloud(classId) {
  return wx.cloud.callFunction({
    name: 'leaveClass',
    data: {
      classId
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '退出班级失败'))
    }

    return res.result
  })
}

function isCurrentUserAdmin() {
  return wx.cloud.callFunction({
    name: 'checkAdmin'
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return false
    }

    return !!res.result.isAdmin
  })
}

function getMyCourseRepRoles() {
  return wx.cloud.callFunction({
    name: 'checkCourseRep'
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return []
    }

    return res.result.roles || []
  })
}

function subscribeHomeworkNotice() {
  return wx.cloud.callFunction({
    name: 'subscribeHomeworkNotice'
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '开启提醒失败'))
    }

    return res.result
  })
}

function normalizeCloudHomework(homework) {
  return {
    ...homework,
    id: homework._id,
    source: 'cloud'
  }
}

function getHomeworkByClassFromCloud(classId) {
  return db.collection(COLLECTIONS.homework)
    .where({
      classId
    })
    .get()
    .then((res) => res.data.map(normalizeCloudHomework))
}

function getAllHomeworkFromCloud() {
  return db.collection(COLLECTIONS.homework)
    .get()
    .then((res) => res.data.map(normalizeCloudHomework))
}

function getHomeworkByClassAndCourseFromCloud(classId, courseId) {
  return db.collection(COLLECTIONS.homework)
    .where({
      classId,
      courseId
    })
    .get()
    .then((res) => res.data.map(normalizeCloudHomework))
}

function getHomeworkByIdFromCloud(id) {
  return db.collection(COLLECTIONS.homework)
    .doc(id)
    .get()
    .then((res) => normalizeCloudHomework(res.data))
}

function saveHomeworkToCloud(homework) {
  return wx.cloud.callFunction({
    name: 'createHomework',
    data: {
      homework
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '发布失败'))
    }

    return res.result
  })
}

function updateHomeworkToCloud(homeworkId, homework) {
  return wx.cloud.callFunction({
    name: 'updateHomework',
    data: {
      homeworkId,
      homework
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '修改失败'))
    }

    return res.result
  })
}

function deleteHomeworkFromCloud(id) {
  return wx.cloud.callFunction({
    name: 'deleteHomework',
    data: {
      homeworkId: id
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '删除失败'))
    }

    return res.result
  })
}

function getCourseByIdFromCloud(courseId) {
  return db.collection(COLLECTIONS.courses)
    .where({
      courseId
    })
    .limit(1)
    .get()
    .then((res) => res.data[0] || null)
}

function getAllCoursesFromCloud() {
  return db.collection(COLLECTIONS.courses)
    .get()
    .then((res) => res.data)
}

function getCoursesByClassFromCloud(classId) {
  return db.collection(COLLECTIONS.classCourses)
    .where({
      classId
    })
    .get()
    .then((relationRes) => {
      const courseIds = relationRes.data.map((item) => item.courseId)

      if (courseIds.length === 0) {
        return []
      }

      return db.collection(COLLECTIONS.courses)
        .where({
          courseId: db.command.in(courseIds)
        })
        .get()
        .then((courseRes) => courseRes.data)
    })
}

function getClassesFromCloud() {
  return db.collection(COLLECTIONS.classes)
    .get()
    .then((res) => res.data
      .filter((item) => item.classId && item.name)
      .map((item) => ({
        id: item.classId,
        name: item.name,
        courseIds: []
      })))
}

function createClassToCloud(classInfo) {
  return wx.cloud.callFunction({
    name: 'createClass',
    data: classInfo
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '添加班级失败'))
    }

    return res.result
  })
}

function deleteClassFromCloud(classId) {
  return wx.cloud.callFunction({
    name: 'deleteClass',
    data: {
      classId
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '删除班级失败'))
    }

    return res.result
  })
}

function createCourseToCloud(courseInfo) {
  return wx.cloud.callFunction({
    name: 'createCourse',
    data: courseInfo
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '添加课程失败'))
    }

    return res.result
  })
}

function getCourseRepsFromCloud() {
  return wx.cloud.callFunction({
    name: 'listCourseReps'
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return []
    }

    return res.result.reps || []
  })
}

function createCourseRepToCloud(repInfo) {
  return wx.cloud.callFunction({
    name: 'createCourseRep',
    data: repInfo
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '添加课代表失败'))
    }

    return res.result
  })
}

function deleteCourseRepFromCloud(repId) {
  return wx.cloud.callFunction({
    name: 'deleteCourseRep',
    data: {
      repId
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '删除课代表失败'))
    }

    return res.result
  })
}

function deleteCourseFromCloud(courseId, classId) {
  return wx.cloud.callFunction({
    name: 'deleteCourse',
    data: {
      courseId,
      classId
    }
  }).then((res) => {
    if (!res.result || !res.result.success) {
      return Promise.reject(new Error(res.result && res.result.message ? res.result.message : '删除课程失败'))
    }

    return res.result
  })
}

module.exports = {
  db,
  COLLECTIONS,
  getCurrentOpenid,
  getCurrentStudentFromCloud,
  saveStudentToCloud,
  deleteMyStudentInfoFromCloud,
  getClassMembersFromCloud,
  leaveClassFromCloud,
  isCurrentUserAdmin,
  subscribeHomeworkNotice,
  getHomeworkByClassFromCloud,
  getAllHomeworkFromCloud,
  getHomeworkByClassAndCourseFromCloud,
  getHomeworkByIdFromCloud,
  saveHomeworkToCloud,
  updateHomeworkToCloud,
  deleteHomeworkFromCloud,
  getCourseByIdFromCloud,
  getAllCoursesFromCloud,
  getCoursesByClassFromCloud,
  getClassesFromCloud,
  createClassToCloud,
  deleteClassFromCloud,
  createCourseToCloud,
  deleteCourseFromCloud,
  getMyCourseRepRoles,
  getCourseRepsFromCloud,
  createCourseRepToCloud,
  deleteCourseRepFromCloud
}
