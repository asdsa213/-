const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const classId = (event.classId || '').trim()

  if (!classId) {
    return {
      success: false,
      message: '缺少班级编号',
      members: []
    }
  }

  const mineByClassIds = await db.collection('students')
    .where({
      openid,
      classIds: classId
    })
    .limit(1)
    .get()
  const mineByClassId = await db.collection('students')
    .where({
      openid,
      classId
    })
    .limit(1)
    .get()

  if (mineByClassIds.data.length === 0 && mineByClassId.data.length === 0) {
    return {
      success: false,
      message: '你尚未绑定该班级',
      members: []
    }
  }

  const byClassIds = await db.collection('students')
    .where({
      classIds: classId
    })
    .get()
  const byClassId = await db.collection('students')
    .where({
      classId
    })
    .get()
  const members = byClassIds.data
    .concat(byClassId.data)
    .filter((item, index, array) => array.findIndex((student) => student._id === item._id) === index)

  return {
    success: true,
    members: members.map((item) => ({
      name: item.name,
      studentNo: item.studentNo
    }))
  }
}
