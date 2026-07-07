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

  if (!classId) {
    return {
      success: false,
      message: '缺少班级编号'
    }
  }

  await db.collection('classes')
    .where({
      classId
    })
    .remove()

  await db.collection('class_courses')
    .where({
      classId
    })
    .remove()

  return {
    success: true
  }
}
