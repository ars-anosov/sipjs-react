const createPhoneRuntime = () => ({
  userAgentOptions: null,
  sessionOptions: null,
  userAgent: null,
  registerer: null,
  audioLocalIn: null,
  audioLocalOut: null,
  audioRemote: null,
  remoteStream: null,
  incomingSession: null,
  outgoingSession: null,
})

const phoneRuntime = createPhoneRuntime()

const getPhoneRuntime = function() {
  return phoneRuntime
}

const setPhoneRuntime = function(values) {
  Object.assign(phoneRuntime, values)
}

const resetPhoneRuntime = function() {
  Object.assign(phoneRuntime, createPhoneRuntime())
}

const resetPhoneRuntimeSessions = function() {
  setPhoneRuntime({
    incomingSession: null,
    outgoingSession: null,
  })
}

export {
  getPhoneRuntime,
  setPhoneRuntime,
  resetPhoneRuntime,
  resetPhoneRuntimeSessions,
}
