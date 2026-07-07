const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const res = await db.collection('course_reps')
    .where({
      openid,
      enabled: true
    })
    .get()

  return {
    success: true,
    roles: res.data
  }
}
