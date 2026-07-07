const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function isAdmin(openid) {
  const res = await db.collection('admins')
    .where({
      openid,
      enabled: true
    })
    .limit(1)
    .get()

  return res.data.length > 0
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const adminOpenid = wxContext.OPENID
  const admin = await isAdmin(adminOpenid)

  if (!admin) {
    return {
      success: false,
      message: '无管理员权限'
    }
  }

  const classId = (event.classId || '').trim()
  const className = (event.className || '').trim()
  const courseId = (event.courseId || '').trim()
  const courseName = (event.courseName || '').trim()
  const studentNo = (event.studentNo || '').trim()

  if (!classId || !className || !courseId || !courseName || !studentNo) {
    return {
      success: false,
      message: '请填写完整课代表信息'
    }
  }

  const studentByClassIds = await db.collection('students')
    .where({
      classIds: classId,
      studentNo
    })
    .limit(1)
    .get()
  const studentByClassId = await db.collection('students')
    .where({
      classId,
      studentNo
    })
    .limit(1)
    .get()
  const students = studentByClassIds.data.concat(studentByClassId.data)

  if (students.length === 0) {
    return {
      success: false,
      message: '没有找到该学生，请确认学生已绑定信息'
    }
  }

  const student = students[0]
  const exists = await db.collection('course_reps')
    .where({
      openid: student.openid,
      classId,
      courseId,
      enabled: true
    })
    .limit(1)
    .get()

  if (exists.data.length > 0) {
    return {
      success: false,
      message: '该学生已经是这门课的课代表'
    }
  }

  const result = await db.collection('course_reps')
    .add({
      data: {
        openid: student.openid,
        name: student.name,
        studentNo: student.studentNo,
        classId,
        className,
        courseId,
        courseName,
        enabled: true,
        creatorOpenid: adminOpenid,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

  return {
    success: true,
    repId: result._id
  }
}
