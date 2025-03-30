/// <reference types="jest" />
import { SignalClient } from '../api/SignalClient';
import RTCEngine from '../room/RTCEngine';
declare const mocks: {
    SignalClient: jest.MockedClass<typeof SignalClient>;
    RTCEngine: jest.MockedClass<typeof RTCEngine>;
    MockLocalVideoTrack: {
        stop: jest.Mock<any, any>;
    };
};
export default mocks;
//# sourceMappingURL=mocks.d.ts.map