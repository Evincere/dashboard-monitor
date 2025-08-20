const fs = require('fs');

// Read the working file
let content = fs.readFileSync('/home/semper/dashboard-monitor/src/app/api/validation/postulants/route.ts', 'utf8');

// PATCH 1: Fix the circunscripcion filter logic
const oldCircunscripcionLogic = `if (circunscripcionFilter === 'PRIMERA_CIRCUNSCRIPCION') return centro.includes('primera');
        if (circunscripcionFilter === 'SEGUNDA_CIRCUNSCRIPCION') return centro.includes('segunda');
        if (circunscripcionFilter === 'TERCERA_CIRCUNSCRIPCION') return centro.includes('tercera');
        if (circunscripcionFilter === 'CUARTA_CIRCUNSCRIPCION') return centro.includes('cuarta');`;

const newCircunscripcionLogic = `if (circunscripcionFilter === 'PRIMERA_CIRCUNSCRIPCION') {
          return centro.includes('primera') || centro.includes('1°') || centro.includes('1') || 
                 centro.includes('capital') || centro.includes('mendoza');
        }
        if (circunscripcionFilter === 'SEGUNDA_CIRCUNSCRIPCION') {
          return centro.includes('segunda') || centro.includes('2°') || centro.includes('2') || 
                 centro.includes('san rafael');
        }
        if (circunscripcionFilter === 'TERCERA_CIRCUNSCRIPCION') {
          return centro.includes('tercera') || centro.includes('3°') || centro.includes('3') || 
                 centro.includes('san martin') || centro.includes('san martín');
        }
        if (circunscripcionFilter === 'CUARTA_CIRCUNSCRIPCION') {
          return centro.includes('cuarta') || centro.includes('4°') || centro.includes('4') || 
                 centro.includes('tunuyan') || centro.includes('tunuyán');
        }`;

content = content.replace(oldCircunscripcionLogic, newCircunscripcionLogic);

// PATCH 2: Fix status filter - add the actual filtering logic
const statusFilterSection = `// Apply filters
    let filteredUsers = eligibleUsers;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter((user: any) => {
        return (
          user.dni?.toLowerCase().includes(searchLower) ||
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (circunscripcionFilter) {`;

const newStatusFilterSection = `// Apply filters
    let filteredUsers = eligibleUsers;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter((user: any) => {
        return (
          user.dni?.toLowerCase().includes(searchLower) ||
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      });
    }

    // FIXED: Add status filter logic
    if (statusFilter && statusFilter !== 'all') {
      filteredUsers = filteredUsers.filter((user: any) => {
        const inscription = eligibleInscriptions.find((ins: any) => ins.userId === user.id);
        if (!inscription) return false;
        
        let validationStatus = 'PENDING';
        if (inscription.state === 'APPROVED') validationStatus = 'APPROVED';
        else if (inscription.state === 'REJECTED') validationStatus = 'REJECTED';
        else if (inscription.state === 'PENDING') validationStatus = 'IN_REVIEW';
        
        return validationStatus === statusFilter;
      });
    }

    if (circunscripcionFilter && circunscripcionFilter !== 'all') {`;

content = content.replace(statusFilterSection, newStatusFilterSection);

// PATCH 3: Improve the circunscripcion mapping in postulant creation
const oldCircMapping = `if (centro.includes('primera')) circunscripcion = 'PRIMERA_CIRCUNSCRIPCION';
        else if (centro.includes('segunda')) circunscripcion = 'SEGUNDA_CIRCUNSCRIPCION';
        else if (centro.includes('tercera')) circunscripcion = 'TERCERA_CIRCUNSCRIPCION';
        else if (centro.includes('cuarta')) circunscripcion = 'CUARTA_CIRCUNSCRIPCION';`;

const newCircMapping = `if (centro.includes('primera') || centro.includes('1°') || centro.includes('1') || 
            centro.includes('capital') || centro.includes('mendoza')) {
          circunscripcion = 'PRIMERA_CIRCUNSCRIPCION';
        } else if (centro.includes('segunda') || centro.includes('2°') || centro.includes('2') || 
                   centro.includes('san rafael')) {
          circunscripcion = 'SEGUNDA_CIRCUNSCRIPCION';
        } else if (centro.includes('tercera') || centro.includes('3°') || centro.includes('3') || 
                   centro.includes('san martin') || centro.includes('san martín')) {
          circunscripcion = 'TERCERA_CIRCUNSCRIPCION';
        } else if (centro.includes('cuarta') || centro.includes('4°') || centro.includes('4') || 
                   centro.includes('tunuyan') || centro.includes('tunuyán')) {
          circunscripcion = 'CUARTA_CIRCUNSCRIPCION';
        }`;

content = content.replace(oldCircMapping, newCircMapping);

// Write the patched file
fs.writeFileSync('/home/semper/dashboard-monitor/src/app/api/validation/postulants/route.ts', content);
console.log('✅ Applied critical patches to postulants endpoint');
