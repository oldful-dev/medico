import React from 'react';
import { InteractivePhoneUI } from './InteractivePhoneUI';

export function PhoneFrame() {
  return (
    <div className="relative mx-auto w-[320px] h-[640px] border-[10px] border-[#F2F2F2] rounded-[40px] shadow-2xl overflow-hidden bg-white z-20 transform translate-y-12">
      {/* Notch / Dynamic Island simulate */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[24px] bg-[#F2F2F2] rounded-b-2xl z-30"></div>
      
      {/* Inner Screen */}
      <div className="w-full h-full overflow-hidden bg-white relative rounded-[30px] border-4 border-white">
        <InteractivePhoneUI />
      </div>
    </div>
  );
}
