// Run every test in one fixed time zone so date tests behave the same on any machine.
// Europe/London has DST, so the tests also cover wall-clock times across DST changes.
module.exports = () => {
  process.env.TZ = 'Europe/London';
};
