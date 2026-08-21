const debts = [
  { allocation: 25000, repayment: 16494 }
];
let totalOrig = 0;
let totalRepaid = 0;
debts.forEach(d => { totalOrig += d.allocation; totalRepaid += d.repayment; });
console.log(Math.max(0, totalOrig - totalRepaid));
