import { AccountData, ParticipateParams, StakingContractState } from "../types";
import { SmartContractStakingClient } from "../clients/SmartContractStakingClient";
import {
  ABIContract,
  Algodv2,
  AtomicTransactionComposer,
  Indexer,
  makePaymentTxnWithSuggestedParamsFromObject,
  Transaction,
} from "algosdk";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import abi from "../clients/contract.json";
import { getTransactionParams } from "@algorandfoundation/algokit-utils";
import { AccountResult } from "@algorandfoundation/algokit-utils/types/indexer";
import { CoreAccount } from "@repo/algocore";
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";
import { CONTRACT } from "ulujs";

// TODO move to ulujs abi
const messengerCtcInfo = 72977126;
const messengerSpec = {
  name: "messenger",
  desc: "messenger",
  methods: [],
  events: [
    {
      name: "PartKeyInfo",
      args: [
        {
          type: "address",
          name: "who",
        },
        {
          type: "address",
          name: "adddress",
        },
        {
          type: "byte[32]",
          name: "vote_k",
        },
        {
          type: "byte[32]",
          name: "sel_k",
        },
        {
          type: "uint64",
          name: "vote_fst",
        },
        {
          type: "uint64",
          name: "vote_lst",
        },
        {
          type: "uint64",
          name: "vote_kd",
        },
        {
          type: "byte[64]",
          name: "sp_key",
        },
      ],
    },
  ],
};

export class CoreStaker {
  accountData: AccountData;

  constructor(accountData: AccountData) {
    this.accountData = accountData;
  }

  contractId(): number {
    return this.accountData.contractId;
  }

  stakingAddress(): string {
    return this.accountData.contractAddress;
  }

  async getStakingState(algod: Algodv2): Promise<StakingContractState> {
    const contractId = this.contractId();
    return await new SmartContractStakingClient(
      { resolveBy: "id", id: contractId },
      algod
    ).getGlobalState();
  }

  async getAvailableParticipationKeys(
    algod: Algodv2,
    indexer: Indexer,
    address?: string
  ): Promise<any> {
    const ci = new CONTRACT(messengerCtcInfo, algod, indexer, messengerSpec, {
      addr: this.stakingAddress(),
      sk: new Uint8Array(0),
    });
    const evts = await ci.getEvents({
      minRound: 0,
      sender: address,
    });
    return evts.find((evt: any) => evt.name === "PartKeyInfo")?.events || [];
  }

  getLockingPeriod(state: StakingContractState): number {
    return state.period?.asNumber() || 0;
  }

  hasLocked(state: StakingContractState): boolean {
    return this.getLockingPeriod(state) != 0;
  }

  hasStaked(contractAccount: AccountResult): boolean {
    return new CoreAccount(contractAccount).isOnline();
  }

  async lock(
    algod: Algodv2,
    months: number,
    sender: TransactionSignerAccount
  ): Promise<Transaction> {
    const contractId = this.contractId();
    const result = await new SmartContractStakingClient(
      { resolveBy: "id", id: contractId },
      algod
    ).configure(
      {
        period: months,
      },
      {
        sender,
      }
    );

    return result.transaction;
  }

  async stake(
    algod: Algodv2,
    params: ParticipateParams,
    sender: TransactionSignerAccount
  ): Promise<string> {
    const contractId = this.contractId();

    const txnParams = await getTransactionParams(undefined, algod);
    const atc = new AtomicTransactionComposer();

    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: this.stakingAddress(),
      suggestedParams: txnParams,
      amount: 1000,
    });

    atc.addTransaction({ txn: paymentTxn, signer: sender.signer });

    atc.addMethodCall({
      appID: contractId,
      method: new ABIContract(abi).getMethodByName("participate"),
      methodArgs: [
        params.voteK,
        params.selK,
        params.voteFst,
        params.voteLst,
        params.voteKd,
        params.spKey,
      ],
      sender: sender.addr,
      signer: sender.signer,
      suggestedParams: txnParams,
    });

    const result = await atc.execute(algod, 4);

    return result.txIDs[1];
  }

  async withdraw(
    algod: Algodv2,
    amount: number,
    sender: TransactionSignerAccount
  ): Promise<Transaction> {
    const contractId = this.contractId();
    const result = await new SmartContractStakingClient(
      { resolveBy: "id", id: contractId },
      algod
    ).withdraw(
      {
        amount: amount,
      },
      {
        sender,
        sendParams: {
          fee: AlgoAmount.MicroAlgos(2000),
        },
      }
    );

    return result.transaction;
  }

  async deposit(
    algod: Algodv2,
    amount: number,
    sender: TransactionSignerAccount
  ): Promise<string> {
    const txnParams = await getTransactionParams(undefined, algod);
    const atc = new AtomicTransactionComposer();

    const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: this.stakingAddress(),
      suggestedParams: txnParams,
      amount: amount,
    });

    atc.addTransaction({ txn: paymentTxn, signer: sender.signer });

    const result = await atc.execute(algod, 4);

    return result.txIDs[0];
  }

  async transfer(
    algod: Algodv2,
    address: string,
    sender: TransactionSignerAccount
  ): Promise<Transaction> {
    const contractId = this.contractId();
    const result = await new SmartContractStakingClient(
      { resolveBy: "id", id: contractId },
      algod
    ).transfer(
      {
        newOwner: address,
      },
      {
        sender,
      }
    );

    return result.transaction;
  }
}
