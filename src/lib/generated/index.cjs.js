const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'attendance-connector',
  service: 'dataconnect',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const upsertAttendanceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertAttendance', inputVars);
}
upsertAttendanceRef.operationName = 'UpsertAttendance';
exports.upsertAttendanceRef = upsertAttendanceRef;

exports.upsertAttendance = function upsertAttendance(dcOrVars, vars) {
  return executeMutation(upsertAttendanceRef(dcOrVars, vars));
};

const getStudentsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStudents', inputVars);
}
getStudentsRef.operationName = 'GetStudents';
exports.getStudentsRef = getStudentsRef;

exports.getStudents = function getStudents(dcOrVars, vars) {
  return executeQuery(getStudentsRef(dcOrVars, vars));
};

const getAttendanceByDateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAttendanceByDate', inputVars);
}
getAttendanceByDateRef.operationName = 'GetAttendanceByDate';
exports.getAttendanceByDateRef = getAttendanceByDateRef;

exports.getAttendanceByDate = function getAttendanceByDate(dcOrVars, vars) {
  return executeQuery(getAttendanceByDateRef(dcOrVars, vars));
};
