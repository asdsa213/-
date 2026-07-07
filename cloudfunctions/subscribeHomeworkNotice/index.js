const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const studentRes = await db.collection('students')
    .where({
      openid
    })
    .limit(1)
    .get()

  if (studentRes.data.length === 0) {
    return {
      success: false,
      message: '请先绑定学生信息'
    }
  }

  await db.collection('students')
    .doc(studentRes.data[0]._id)
    .update({
      data: {
        homeworkNoticeEnabled: true,
        homeworkNoticeTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

  return {
    success: true
  }
}
