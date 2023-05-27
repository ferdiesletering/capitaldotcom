export interface Positions {
  positions: [{
    position: Position;
    market: Market;
  }]
}

export interface Position {
  contractSize: number;
  createdDate: string;
  createdDateUTC: string;
  dealId: string;
  dealReference: string;
  workingOrderId: string;
  size: number;
  leverage: number;
  upl: number;
  direction: 'BUY' | 'SELL';
  level: number;
  currency: string;
  guaranteedStop: boolean;
}

export interface Market {
  instrumentName: string;
  expiry: string;
  marketStatus: string;
  epic: string;
  instrumentType: string;
  lotSize: number;
  high: number;
  low: number;
  percentageChange: number;
  netChange: number;
  bid: number;
  offer: number;
  updateTime: string;
  updateTimeUTC: string;
  delayTime: number;
  streamingPricesAvailable: boolean;
  scalingFactor: number;
}
