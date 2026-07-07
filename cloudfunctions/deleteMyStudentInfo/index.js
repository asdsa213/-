const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const res = await db.collection('students')
    .where({
      openid
    })
    .get()

  for (const student of res.data) {
    await db.collection('students')
      .doc(student._id)
      .remove()
  }

  return {
    success: true,
    deletedCount: res.data.length
  }
}
