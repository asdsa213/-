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

  const courseId = (event.courseId || '').trim()
  const classId = (event.classId || '').trim()

  if (!courseId) {
    return {
      success: false,
      message: '缺少课程编号'
    }
  }

  if (classId) {
    await db.collection('class_courses')
      .where({
        classId,
        courseId
      })
      .remove()
  } else {
    await db.collection('class_courses')
      .where({
        courseId
      })
      .remove()
  }

  const relationRes = await db.collection('class_courses')
    .where({
      courseId
    })
    .limit(1)
    .get()

  if (relationRes.data.length === 0) {
    await db.collection('courses')
      .where({
        courseId
      })
      .remove()
  }

  return {
    success: true
  }
}
