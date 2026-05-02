# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { upsertAttendance, getStudents, getAttendanceByDate } from '@firebasegen/attendance-connector';


// Operation UpsertAttendance:  For variables, look at type UpsertAttendanceVars in ../index.d.ts
const { data } = await UpsertAttendance(dataConnect, upsertAttendanceVars);

// Operation GetStudents:  For variables, look at type GetStudentsVars in ../index.d.ts
const { data } = await GetStudents(dataConnect, getStudentsVars);

// Operation GetAttendanceByDate:  For variables, look at type GetAttendanceByDateVars in ../index.d.ts
const { data } = await GetAttendanceByDate(dataConnect, getAttendanceByDateVars);


```