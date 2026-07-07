const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
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

  const student = res.data[0] || null

  if (!student) {
    return {
      success: true,
      student: null
    }
  }

  const classes = student.classes && student.classes.length > 0 ? student.classes : [{
    id: student.classId,
    name: student.className
  }]

  if (!student.classIds || student.classIds.length === 0) {
    await db.collection('students')
      .doc(student._id)
      .update({
        data: {
          classes,
          classIds: classes.map((item) => item.id)
        }
      })
  }

  return {
    success: true,
    student: {
      _id: student._id,
      openid,
      name: student.name,
      studentNo: student.studentNo,
      classId: student.classId,
      className: student.className,
      classes
    }
  }
}
