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

  const repId = event.repId

  if (!repId) {
    return {
      success: false,
      message: '缺少课代表记录ID'
    }
  }

  await db.collection('course_reps')
    .doc(repId)
    .update({
      data: {
        enabled: false,
        updateTime: db.serverDate()
      }
    })

  return {
    success: true
  }
}
