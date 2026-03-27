import { createSlice } from '@reduxjs/toolkit';

const myUiSlice = createSlice({
  name: 'myUi',
  initialState: {
    dashboardOrder: [] as string[],
    isFilterExpanded: false,
  },
  reducers: {},
});

export const myUiReducer = myUiSlice.reducer;
