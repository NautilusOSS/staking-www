import {
  AsyncThunk,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import {
  AccountData,
  CoreStaker,
  StakingClient,
  StakingContractState,
} from "@repo/voix";
import { AccountResult } from "@algorandfoundation/algokit-utils/types/indexer";
import { AccountClient } from "@repo/algocore";
import voiStakingUtils from "../../utils/voiStakingUtils";

export type UserState = {
  account: {
    loading: boolean;
    data: AccountData | undefined;
    availableContracts: AccountData[];
    availableKeys?: any[];
  };
  staking: {
    loading: boolean;
    account: AccountResult | undefined;
  };
  contract: {
    loading: boolean;
    state: StakingContractState | undefined;
  };
};

const initialState: UserState = {
  account: {
    loading: false,
    data: undefined,
    availableContracts: [],
  },
  staking: {
    loading: false,
    account: undefined,
  },
  contract: {
    loading: false,
    state: undefined,
  },
};

export const loadAccountData: AsyncThunk<void, string, any> = createAsyncThunk(
  "user/loadAccountData",
  async (address: string, thunkAPI) => {
    const { dispatch } = thunkAPI;
    try {
      dispatch(resetUserState());
      dispatch(setAccountDataLoading(true));
      const availableContracts = await new StakingClient().getAccountData(
        address
      );
      dispatch(setAvailableContracts(availableContracts));

      if (availableContracts.length > 0) {
        let accountData: AccountData | undefined = availableContracts[0];

        const currentContractId = localStorage.getItem("currentContractId");
        if (currentContractId) {
          accountData =
            availableContracts.find((accountData) => {
              return accountData.contractId.toString() === currentContractId;
            }) || availableContracts[0];
        }

        if (accountData) {
          dispatch(initAccountData(accountData));
        }
      }
    } catch (e) {
      /* empty */
    } finally {
      dispatch(setAccountDataLoading(false));
    }
  }
);

export const initAccountData: AsyncThunk<void, AccountData, any> =
  createAsyncThunk(
    "user/initAccountData",
    async (accountData: AccountData, thunkAPI) => {
      const { dispatch } = thunkAPI;
      dispatch(setAccountData(accountData));
      dispatch(loadStakingAccount(accountData.contractAddress));
      dispatch(loadContractState(accountData));
      localStorage.setItem(
        "currentContractId",
        accountData.contractId.toString()
      );
    }
  );

export const loadStakingAccount: AsyncThunk<void, string, any> =
  createAsyncThunk(
    "user/loadStakingAccount",
    async (address: string, thunkAPI) => {
      const { dispatch } = thunkAPI;
      try {
        dispatch(setStakingAccountLoading(true));
        const account = await new AccountClient(voiStakingUtils.network).get(
          address
        );
        dispatch(setStakingAccount(account));
      } catch (e) {
        /* empty */
      } finally {
        dispatch(setStakingAccountLoading(false));
      }
    }
  );

export const loadContractState: AsyncThunk<void, AccountData, any> =
  createAsyncThunk(
    "user/loadContractState",
    async (data: AccountData, thunkAPI) => {
      const { dispatch } = thunkAPI;
      try {
        dispatch(setContractStateLoading(true));
        const state = await new CoreStaker(data).getStakingState(
          voiStakingUtils.network.getAlgodClient()
        );
        console.log({ data });
        const res = await new CoreStaker(data).getAvailableParticipationKeys(
          voiStakingUtils.network.getAlgodClient(),
          voiStakingUtils.network.getIndexerClient(),
        )
        console.log({ state, res });
        dispatch(setContractState(state));
      } catch (e) {
        /* empty */
      } finally {
        dispatch(setContractStateLoading(false));
      }
    }
  );

export const nodeSlice = createSlice({
  name: "node",
  initialState,
  reducers: {
    resetUserState: () => initialState,
    setAccountDataLoading: (state, action: PayloadAction<boolean>) => {
      state.account.loading = action.payload;
    },
    setAccountData: (state, action: PayloadAction<AccountData>) => {
      state.account.data = action.payload;
    },
    setAvailableContracts: (state, action: PayloadAction<AccountData[]>) => {
      state.account.availableContracts = action.payload;
    },
    setAvailableParticipationKeys: (state, action: PayloadAction<any[]>) => {
      state.account.availableKeys = action.payload;
    },
    setStakingAccountLoading: (state, action: PayloadAction<boolean>) => {
      state.staking.loading = action.payload;
    },
    setStakingAccount: (state, action: PayloadAction<AccountResult>) => {
      state.staking.account = action.payload;
    },
    setContractStateLoading: (state, action: PayloadAction<boolean>) => {
      state.contract.loading = action.payload;
    },
    setContractState: (state, action: PayloadAction<StakingContractState>) => {
      state.contract.state = action.payload;
    },
  },
});

export const {
  setStakingAccountLoading,
  setAccountData,
  setAccountDataLoading,
  setStakingAccount,
  setContractStateLoading,
  setContractState,
  setAvailableContracts,
  resetUserState,
} = nodeSlice.actions;

export default nodeSlice.reducer;
