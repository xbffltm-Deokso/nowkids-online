# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `attendance-connector`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetStudents*](#getstudents)
  - [*GetAttendanceByDate*](#getattendancebydate)
- [**Mutations**](#mutations)
  - [*UpsertAttendance*](#upsertattendance)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `attendance-connector`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@firebasegen/attendance-connector` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/attendance-connector';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/attendance-connector';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `attendance-connector` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetStudents
You can execute the `GetStudents` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getStudents(vars: GetStudentsVariables): QueryPromise<GetStudentsData, GetStudentsVariables>;

interface GetStudentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStudentsVariables): QueryRef<GetStudentsData, GetStudentsVariables>;
}
export const getStudentsRef: GetStudentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getStudents(dc: DataConnect, vars: GetStudentsVariables): QueryPromise<GetStudentsData, GetStudentsVariables>;

interface GetStudentsRef {
  ...
  (dc: DataConnect, vars: GetStudentsVariables): QueryRef<GetStudentsData, GetStudentsVariables>;
}
export const getStudentsRef: GetStudentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getStudentsRef:
```typescript
const name = getStudentsRef.operationName;
console.log(name);
```

### Variables
The `GetStudents` query requires an argument of type `GetStudentsVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetStudentsVariables {
  grade: string;
  classNum: number;
}
```
### Return Type
Recall that executing the `GetStudents` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetStudentsData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetStudentsData {
  students: ({
    id: string;
    grade: string;
    classNum: number;
    number: number;
    name: string;
    gender: string;
    status: string;
  } & Student_Key)[];
}
```
### Using `GetStudents`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getStudents, GetStudentsVariables } from '@firebasegen/attendance-connector';

// The `GetStudents` query requires an argument of type `GetStudentsVariables`:
const getStudentsVars: GetStudentsVariables = {
  grade: ..., 
  classNum: ..., 
};

// Call the `getStudents()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getStudents(getStudentsVars);
// Variables can be defined inline as well.
const { data } = await getStudents({ grade: ..., classNum: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getStudents(dataConnect, getStudentsVars);

console.log(data.students);

// Or, you can use the `Promise` API.
getStudents(getStudentsVars).then((response) => {
  const data = response.data;
  console.log(data.students);
});
```

### Using `GetStudents`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getStudentsRef, GetStudentsVariables } from '@firebasegen/attendance-connector';

// The `GetStudents` query requires an argument of type `GetStudentsVariables`:
const getStudentsVars: GetStudentsVariables = {
  grade: ..., 
  classNum: ..., 
};

// Call the `getStudentsRef()` function to get a reference to the query.
const ref = getStudentsRef(getStudentsVars);
// Variables can be defined inline as well.
const ref = getStudentsRef({ grade: ..., classNum: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getStudentsRef(dataConnect, getStudentsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.students);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.students);
});
```

## GetAttendanceByDate
You can execute the `GetAttendanceByDate` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
getAttendanceByDate(vars: GetAttendanceByDateVariables): QueryPromise<GetAttendanceByDateData, GetAttendanceByDateVariables>;

interface GetAttendanceByDateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAttendanceByDateVariables): QueryRef<GetAttendanceByDateData, GetAttendanceByDateVariables>;
}
export const getAttendanceByDateRef: GetAttendanceByDateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAttendanceByDate(dc: DataConnect, vars: GetAttendanceByDateVariables): QueryPromise<GetAttendanceByDateData, GetAttendanceByDateVariables>;

interface GetAttendanceByDateRef {
  ...
  (dc: DataConnect, vars: GetAttendanceByDateVariables): QueryRef<GetAttendanceByDateData, GetAttendanceByDateVariables>;
}
export const getAttendanceByDateRef: GetAttendanceByDateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAttendanceByDateRef:
```typescript
const name = getAttendanceByDateRef.operationName;
console.log(name);
```

### Variables
The `GetAttendanceByDate` query requires an argument of type `GetAttendanceByDateVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAttendanceByDateVariables {
  date: DateString;
  grade: string;
  classNum: number;
}
```
### Return Type
Recall that executing the `GetAttendanceByDate` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAttendanceByDateData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAttendanceByDateData {
  attendanceRecords: ({
    id: string;
    student: {
      id: string;
      name: string;
    } & Student_Key;
      date: DateString;
      status: boolean;
      reason?: string | null;
      timestamp: TimestampString;
  } & AttendanceRecord_Key)[];
}
```
### Using `GetAttendanceByDate`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAttendanceByDate, GetAttendanceByDateVariables } from '@firebasegen/attendance-connector';

// The `GetAttendanceByDate` query requires an argument of type `GetAttendanceByDateVariables`:
const getAttendanceByDateVars: GetAttendanceByDateVariables = {
  date: ..., 
  grade: ..., 
  classNum: ..., 
};

// Call the `getAttendanceByDate()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAttendanceByDate(getAttendanceByDateVars);
// Variables can be defined inline as well.
const { data } = await getAttendanceByDate({ date: ..., grade: ..., classNum: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAttendanceByDate(dataConnect, getAttendanceByDateVars);

console.log(data.attendanceRecords);

// Or, you can use the `Promise` API.
getAttendanceByDate(getAttendanceByDateVars).then((response) => {
  const data = response.data;
  console.log(data.attendanceRecords);
});
```

### Using `GetAttendanceByDate`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAttendanceByDateRef, GetAttendanceByDateVariables } from '@firebasegen/attendance-connector';

// The `GetAttendanceByDate` query requires an argument of type `GetAttendanceByDateVariables`:
const getAttendanceByDateVars: GetAttendanceByDateVariables = {
  date: ..., 
  grade: ..., 
  classNum: ..., 
};

// Call the `getAttendanceByDateRef()` function to get a reference to the query.
const ref = getAttendanceByDateRef(getAttendanceByDateVars);
// Variables can be defined inline as well.
const ref = getAttendanceByDateRef({ date: ..., grade: ..., classNum: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAttendanceByDateRef(dataConnect, getAttendanceByDateVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.attendanceRecords);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.attendanceRecords);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `attendance-connector` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## UpsertAttendance
You can execute the `UpsertAttendance` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [generated/index.d.ts](./index.d.ts):
```typescript
upsertAttendance(vars: UpsertAttendanceVariables): MutationPromise<UpsertAttendanceData, UpsertAttendanceVariables>;

interface UpsertAttendanceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertAttendanceVariables): MutationRef<UpsertAttendanceData, UpsertAttendanceVariables>;
}
export const upsertAttendanceRef: UpsertAttendanceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertAttendance(dc: DataConnect, vars: UpsertAttendanceVariables): MutationPromise<UpsertAttendanceData, UpsertAttendanceVariables>;

interface UpsertAttendanceRef {
  ...
  (dc: DataConnect, vars: UpsertAttendanceVariables): MutationRef<UpsertAttendanceData, UpsertAttendanceVariables>;
}
export const upsertAttendanceRef: UpsertAttendanceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertAttendanceRef:
```typescript
const name = upsertAttendanceRef.operationName;
console.log(name);
```

### Variables
The `UpsertAttendance` mutation requires an argument of type `UpsertAttendanceVariables`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertAttendanceVariables {
  id: string;
  studentId: string;
  date: DateString;
  status: boolean;
  reason?: string | null;
}
```
### Return Type
Recall that executing the `UpsertAttendance` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertAttendanceData`, which is defined in [generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertAttendanceData {
  attendanceRecord_upsert: AttendanceRecord_Key;
}
```
### Using `UpsertAttendance`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertAttendance, UpsertAttendanceVariables } from '@firebasegen/attendance-connector';

// The `UpsertAttendance` mutation requires an argument of type `UpsertAttendanceVariables`:
const upsertAttendanceVars: UpsertAttendanceVariables = {
  id: ..., 
  studentId: ..., 
  date: ..., 
  status: ..., 
  reason: ..., // optional
};

// Call the `upsertAttendance()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertAttendance(upsertAttendanceVars);
// Variables can be defined inline as well.
const { data } = await upsertAttendance({ id: ..., studentId: ..., date: ..., status: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertAttendance(dataConnect, upsertAttendanceVars);

console.log(data.attendanceRecord_upsert);

// Or, you can use the `Promise` API.
upsertAttendance(upsertAttendanceVars).then((response) => {
  const data = response.data;
  console.log(data.attendanceRecord_upsert);
});
```

### Using `UpsertAttendance`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertAttendanceRef, UpsertAttendanceVariables } from '@firebasegen/attendance-connector';

// The `UpsertAttendance` mutation requires an argument of type `UpsertAttendanceVariables`:
const upsertAttendanceVars: UpsertAttendanceVariables = {
  id: ..., 
  studentId: ..., 
  date: ..., 
  status: ..., 
  reason: ..., // optional
};

// Call the `upsertAttendanceRef()` function to get a reference to the mutation.
const ref = upsertAttendanceRef(upsertAttendanceVars);
// Variables can be defined inline as well.
const ref = upsertAttendanceRef({ id: ..., studentId: ..., date: ..., status: ..., reason: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertAttendanceRef(dataConnect, upsertAttendanceVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.attendanceRecord_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.attendanceRecord_upsert);
});
```

