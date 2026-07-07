const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const profile = event.profile || {}
  const requiredFields = ['name', 'studentNo', 'classId', 'className']
  const missingField = requiredFields.find((field) => !profile[field])

  if (missingField) {
    return {
      success: false,
      message: '请填写完整学生信息'
    }
  }

  let res = await db.collection('students')
    .where({
      openid
    })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    res = await db.collection('students')
      .where({
        _openid: openid
      })
      .limit(1)
      .get()
  }

  const data = {
    openid,
    name: profile.name,
    studentNo: profile.studentNo,
    classId: profile.classId,
    className: profile.className,
    updateTime: db.serverDate()
  }

  if (res.data.length > 0) {
    const oldStudent = res.data[0]
    const oldClasses = oldStudent.classes && oldStudent.classes.length > 0 ? oldStudent.classes : [{
      id: oldStudent.classId,
      name: oldStudent.className
    }]
    const nextClasses = oldClasses
      .filter((item) => item && item.id)
      .concat({
        id: profile.classId,
        name: profile.className
      })
      .filter((item, index, array) => array.findIndex((classItem) => classItem.id === item.id) === index)

    await db.collection('students')
      .doc(oldStudent._id)
      .update({
        data: {
          ...data,
          classes: nextClasses,
          classIds: nextClasses.map((item) => item.id)
        }
      })

    return {
      success: true,
      studentId: oldStudent._id
    }
  }

  const addResult = await db.collection('students')
    .add({
      data: {
        ...data,
        classes: [{
          id: profile.classId,
          name: profile.className
        }],
        classIds: [profile.classId],
        createTime: db.serverDate()
      }
    })

  return {
    success: true,
    studentId: addResult._id
  }
}
