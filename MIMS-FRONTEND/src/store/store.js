import { configureStore } from '@reduxjs/toolkit';

import dutyRosterReducer from '../modules/activityAllocation/admin/store/dutyRosterSlice';
import activityReducer from '../modules/activityAllocation/admin/store/activitySlice';
import visitorReducer from '../modules/visitation/store/visitorSlice';
import visitationSessionReducer from '../modules/visitation/store/visitationSessionSlice';

export const store = configureStore({
  reducer: {
    dutyRoster: dutyRosterReducer,
    activity: activityReducer,
    visitor: visitorReducer,
    visitationSession: visitationSessionReducer,
  },
});

