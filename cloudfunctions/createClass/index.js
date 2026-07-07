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
  const name = (event.name || '').trim()

  if (!classId || !name) {
    return {
      success: false,
      message: '请填写班级编号和班级名称'
    }
  }

  const exists = await db.collection('classes')
    .where({
      classId
    })
    .limit(1)
    .get()

  if (exists.data.length > 0) {
    return {
      success: false,
      message: '班级编号已存在'
    }
  }

  const result = await db.collection('classes')
    .add({
      data: {
        classId,
        name,
        creatorOpenid: openid,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

  return {
    success: true,
    classDocId: result._id
  }
}
