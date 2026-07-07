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
  const openid = wxContext.OPENID
  const admin = await isAdmin(openid)

  if (!admin) {
    return {
      success: false,
      message: '无管理员权限'
    }
  }

  const classId = (event.classId || '').trim()
  const courseId = (event.courseId || '').trim()
  const name = (event.name || '').trim()
  const teacher = (event.teacher || '').trim() || '待填写'

  if (!classId || !courseId || !name) {
    return {
      success: false,
      message: '请填写班级、课程编号和课程名称'
    }
  }

  const classRes = await db.collection('classes')
    .where({
      classId
    })
    .limit(1)
    .get()

  if (classRes.data.length === 0) {
    return {
      success: false,
      message: '班级不存在'
    }
  }

  const courseRes = await db.collection('courses')
    .where({
      courseId
    })
    .limit(1)
    .get()

  if (courseRes.data.length === 0) {
    await db.collection('courses')
      .add({
        data: {
          courseId,
          name,
          teacher,
          creatorOpenid: openid,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
  } else {
    await db.collection('courses')
      .doc(courseRes.data[0]._id)
      .update({
        data: {
          name,
          teacher,
          updateTime: db.serverDate()
        }
      })
  }

  const relationRes = await db.collection('class_courses')
    .where({
      classId,
      courseId
    })
    .limit(1)
    .get()

  if (relationRes.data.length === 0) {
    await db.collection('class_courses')
      .add({
        data: {
          classId,
          courseId,
          creatorOpenid: openid,
          createTime: db.serverDate()
        }
      })
  }

  return {
    success: true
  }
}
