import { configureStore } from '@reduxjs/toolkit';

import dutyRosterReducer from '../modules/activityAllocation/admin/store/dutyRosterSlice';
import activityReducer from '../modules/activityAllocation/admin/store/activitySlice';

export const store = configureStore({
  reducer: {
    dutyRoster: dutyRosterReducer,
    activity: activityReducer,
  },
});

