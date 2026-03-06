const SecurityModule = require('../src/modules/security');

const testUrl = 'https://example.com';
const hash1 = SecurityModule.hashUrl(testUrl);
const hash2 = SecurityModule.hashUrl(testUrl);

console.log(`URL: ${testUrl}`);
console.log(`Hash 1: ${hash1}`);
console.log(`Hash 2: ${hash2}`);

if (hash1 === hash2) {
    console.log('✅ Consistency check passed: Same URL produces same hash.');
} else {
    console.log('❌ Consistency check failed.');
}

const anonId1 = SecurityModule.generateAnonymizedId();
const anonId2 = SecurityModule.generateAnonymizedId();
console.log(`Anon ID 1: ${anonId1}`);
console.log(`Anon ID 2: ${anonId2}`);

if (anonId1 !== anonId2) {
    console.log('✅ Uniqueness check passed: Generated IDs are unique.');
} else {
    console.log('❌ Uniqueness check failed.');
}
