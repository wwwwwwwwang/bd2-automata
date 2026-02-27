# Web Frontend Modification Task Breakdown

## Overview
Detailed task breakdown for modifying `packages/web` to integrate with backend API and align with spec-plan.md requirements.

**Total Estimated Effort**: 8-10 days
**Recommended Team Size**: 1-2 developers

---

## Phase 1: Backend Integration (3 days)

### Task 1.1: Environment & Configuration Setup
**Effort**: 2 hours
**Priority**: P0

- [ ] Update `.env.development` with correct backend API URL
- [ ] Update `.env.production` with production API URL
- [ ] Verify Vite proxy configuration matches backend port (currently 4000, backend likely 8787)
- [ ] Update `src/hooks/setting/useGlobSetting.ts` if needed
- [ ] Test environment variable loading

**Acceptance Criteria**:
- Dev server proxies requests to correct backend port
- Environment variables load correctly
- No CORS errors in browser console

---

### Task 1.2: ID Handling Utilities
**Effort**: 3 hours
**Priority**: P0

- [ ] Create `src/utils/id.ts` with ID utilities:
  - `parseId(id: string | number): string` - normalize to string
  - `validateId(id: string): boolean` - validate format
  - `formatId(id: bigint | string): string` - format for display
- [ ] Add unit tests for ID utilities
- [ ] Update `@bd2-automata/shared` imports if ID types exist there
- [ ] Document ID handling strategy in code comments

**Acceptance Criteria**:
- All ID utilities have unit tests
- IDs are consistently treated as strings
- No `Number()` conversions in codebase

---

### Task 1.3: Update Alova HTTP Client
**Effort**: 4 hours
**Priority**: P0

- [ ] Update `src/utils/http/alova/index.ts`:
  - Remove mock adapter in production
  - Update response transformer for `{items, meta}` format
  - Add ID serialization in response interceptor
  - Update error handling for backend error format
- [ ] Update `src/utils/http/alova/mocks/index.ts`:
  - Keep mocks for development only
  - Align mock responses with backend contract
- [ ] Test request/response flow with real backend
- [ ] Add request/response logging for debugging

**Acceptance Criteria**:
- Alova correctly handles `{items, meta}` list responses
- Single object responses work for detail/create/update/delete
- Error messages display correctly
- Token injection works

---

### Task 1.4: Implement User API Integration
**Effort**: 4 hours
**Priority**: P0

- [ ] Update `src/api/system/user.ts`:
  - Replace mock implementations with real API calls
  - Add TypeScript types from `@bd2-automata/shared`
  - Implement `getUserList(params)` returning `{items, meta}`
  - Implement `getUserDetail(id: string)`
  - Implement `createUser(data)`
  - Implement `updateUser(id: string, data)`
  - Implement `deleteUser(id: string)`
- [ ] Update `src/store/modules/user.ts` if needed
- [ ] Test all user CRUD operations
- [ ] Handle validation errors from backend

**Acceptance Criteria**:
- All user API endpoints work with real backend
- IDs are strings throughout
- Error handling works correctly
- Loading states display properly

---

### Task 1.5: Implement Role API Integration
**Effort**: 3 hours
**Priority**: P1

- [ ] Update `src/api/system/role.ts`:
  - Implement `getRoleList(params)` returning `{items, meta}`
  - Implement `getRoleDetail(id: string)`
  - Implement `createRole(data)`
  - Implement `updateRole(id: string, data)`
  - Implement `deleteRole(id: string)`
- [ ] Add TypeScript types
- [ ] Test all role CRUD operations

**Acceptance Criteria**:
- All role API endpoints work
- Consistent with user API patterns
- Proper error handling

---

### Task 1.6: Implement Permission API Integration
**Effort**: 3 hours
**Priority**: P1

- [ ] Create `src/api/system/permission.ts`:
  - Implement `getPermissionList(params)` returning `{items, meta}`
  - Implement `getPermissionDetail(id: string)`
  - Implement `createPermission(data)`
  - Implement `updatePermission(id: string, data)`
  - Implement `deletePermission(id: string)`
- [ ] Add TypeScript types
- [ ] Test all permission CRUD operations

**Acceptance Criteria**:
- All permission API endpoints work
- Consistent with other API patterns

---

## Phase 2: UI Component Updates (2 days)

### Task 2.1: Update User Management Views
**Effort**: 4 hours
**Priority**: P0

- [ ] Update `src/views/system/user/` components:
  - Update list view to handle `{items, meta}` format
  - Update pagination to use `meta.total`
  - Update form for create/edit
  - Update delete confirmation
  - Ensure all ID fields are strings
- [ ] Test user management UI flows
- [ ] Verify loading states and error messages

**Acceptance Criteria**:
- User list displays correctly with pagination
- Create/edit/delete operations work
- Validation errors display properly

---

### Task 2.2: Update Role Management Views
**Effort**: 3 hours
**Priority**: P1

- [ ] Update `src/views/system/role/` components:
  - Update list view for new response format
  - Update role assignment UI
  - Update permission assignment UI
  - Handle many-to-many relationships
- [ ] Test role management flows

**Acceptance Criteria**:
- Role list and details work correctly
- Role-permission assignment works
- User-role assignment works

---

### Task 2.3: Update Permission Management Views
**Effort**: 3 hours
**Priority**: P1

- [ ] Create/update `src/views/system/permission/` components:
  - Implement permission list view
  - Implement permission detail view
  - Implement permission tree/hierarchy if needed
- [ ] Test permission management flows

**Acceptance Criteria**:
- Permission management UI works
- Consistent with other management views

---

### Task 2.4: Update BasicTable Component
**Effort**: 2 hours
**Priority**: P1

- [ ] Update `src/components/Table/src/BasicTable.vue`:
  - Ensure compatibility with `{items, meta}` format
  - Update pagination props to use `meta`
  - Add ID column formatting helpers
  - Test with all list views

**Acceptance Criteria**:
- BasicTable works with new response format
- Pagination calculates correctly
- No breaking changes to existing usage

---

## Phase 3: Authentication & Routing (1.5 days)

### Task 3.1: Update Authentication Flow
**Effort**: 3 hours
**Priority**: P0

- [ ] Update `src/views/login/index.vue`:
  - Verify login API integration
  - Handle backend validation errors
  - Test token storage
- [ ] Update `src/router/guards.ts`:
  - Verify token validation
  - Test redirect flows
  - Handle 401 responses
- [ ] Test complete login/logout flow

**Acceptance Criteria**:
- Login works with real backend
- Token persists correctly
- Logout clears state properly
- 401 redirects to login

---

### Task 3.2: Switch to BACK Permission Mode
**Effort**: 4 hours
**Priority**: P0

- [ ] Update `src/settings/projectSetting.ts`:
  - Change `permissionMode` from `FIXED` to `BACK`
- [ ] Update `src/store/modules/asyncRoute.ts`:
  - Verify dynamic route generation from backend
  - Test menu building from backend response
  - Handle route permissions
- [ ] Update `src/api/system/menu.ts`:
  - Implement `getMenuList()` if not exists
  - Ensure correct response format
- [ ] Test dynamic menu loading

**Acceptance Criteria**:
- Menus load from backend API
- Route permissions enforced correctly
- Menu structure displays properly
- No hardcoded routes except login/root

---

### Task 3.3: Clean Up Route Modules
**Effort**: 2 hours
**Priority**: P2

- [ ] Remove demo routes from `src/router/modules/`:
  - Remove `comp.ts` (component demos)
  - Remove `about.ts` if not needed
  - Keep only business routes
- [ ] Update route metadata
- [ ] Test routing after cleanup

**Acceptance Criteria**:
- Only business routes remain
- No broken route references
- Navigation works correctly

---

## Phase 4: Code Cleanup & Quality (2.5 days)

### Task 4.1: Remove Template Demo Code
**Effort**: 3 hours
**Priority**: P2

- [ ] Delete demo views:
  - `src/views/comp/*` (component demos)
  - `src/views/about/*` if not needed
  - Other template examples
- [ ] Remove unused components:
  - `src/components/CountTo/*` if not used
  - Other demo components
- [ ] Update imports and references
- [ ] Test build after cleanup

**Acceptance Criteria**:
- Demo code removed
- Build succeeds
- No broken imports
- Bundle size reduced

---

### Task 4.2: TypeScript Type Safety
**Effort**: 4 hours
**Priority**: P1

- [ ] Import types from `@bd2-automata/shared`:
  - User types
  - Role types
  - Permission types
  - API response types
- [ ] Remove duplicate type definitions
- [ ] Fix any `any` types in API layer
- [ ] Add missing type annotations
- [ ] Run TypeScript strict checks

**Acceptance Criteria**:
- No duplicate types
- Shared types imported correctly
- TypeScript compilation succeeds
- Minimal use of `any`

---

### Task 4.3: Add Unit Tests
**Effort**: 6 hours
**Priority**: P1

- [ ] Set up Jest test environment (already installed)
- [ ] Add tests for utilities:
  - ID handling utilities
  - Storage utilities
  - Helper functions
- [ ] Add tests for composables:
  - `useForm` hooks
  - `useTable` hooks
- [ ] Add tests for stores:
  - User store actions
  - AsyncRoute store
- [ ] Achieve >60% coverage for utilities

**Acceptance Criteria**:
- Jest configured and running
- Utility functions have tests
- Store actions have tests
- Tests pass in CI

---

### Task 4.4: Add Integration Tests
**Effort**: 4 hours
**Priority**: P2

- [ ] Set up integration test environment
- [ ] Add API integration tests:
  - Test user CRUD flow
  - Test role CRUD flow
  - Test authentication flow
- [ ] Mock backend responses
- [ ] Test error scenarios

**Acceptance Criteria**:
- Integration tests cover main flows
- Tests can run against mock backend
- Error cases tested

---

### Task 4.5: Documentation
**Effort**: 3 hours
**Priority**: P2

- [ ] Update `packages/web/README.md`:
  - Remove template boilerplate
  - Add project-specific setup instructions
  - Document API integration approach
  - Add development guidelines
- [ ] Add inline code documentation:
  - Document complex functions
  - Add JSDoc comments for public APIs
- [ ] Create architecture diagram
- [ ] Document ID handling strategy

**Acceptance Criteria**:
- README is project-specific
- Setup instructions are clear
- Code has helpful comments
- Architecture is documented

---

## Phase 5: Testing & Polish (1 day)

### Task 5.1: End-to-End Testing
**Effort**: 4 hours
**Priority**: P1

- [ ] Manual testing of all flows:
  - Login/logout
  - User management CRUD
  - Role management CRUD
  - Permission management CRUD
  - Menu navigation
  - Permission enforcement
- [ ] Test on different browsers
- [ ] Test responsive design
- [ ] Test error scenarios

**Acceptance Criteria**:
- All features work end-to-end
- No console errors
- UI is responsive
- Error handling works

---

### Task 5.2: Performance Optimization
**Effort**: 2 hours
**Priority**: P2

- [ ] Analyze bundle size
- [ ] Optimize code splitting if needed
- [ ] Test lazy loading
- [ ] Check for memory leaks
- [ ] Optimize images/assets

**Acceptance Criteria**:
- Bundle size is reasonable
- Initial load time <3s
- No memory leaks
- Lighthouse score >80

---

### Task 5.3: Final Cleanup
**Effort**: 2 hours
**Priority**: P2

- [ ] Remove console.log statements
- [ ] Remove commented code
- [ ] Format code with Prettier
- [ ] Run ESLint and fix issues
- [ ] Update dependencies if needed
- [ ] Final build test

**Acceptance Criteria**:
- No console logs in production
- Code is formatted consistently
- No ESLint errors
- Production build succeeds

---

## Risk Mitigation

### High-Risk Tasks
1. **Task 1.3**: Alova HTTP Client updates - Core integration point
   - Mitigation: Thorough testing, keep mock fallback
2. **Task 3.2**: Permission mode switch - Affects entire app
   - Mitigation: Test extensively, have rollback plan

### Dependencies
- Backend API must be running and accessible
- `@bd2-automata/shared` package must be built
- Database must be seeded with test data

### Blockers
- Backend API not ready → Use mocks temporarily
- Type definitions missing → Create temporary types
- Breaking changes in backend → Coordinate with backend team

---

## Success Metrics

### Functional
- ✅ All CRUD operations work with real backend
- ✅ Authentication flow works end-to-end
- ✅ Dynamic menus load from backend
- ✅ Permissions enforced correctly
- ✅ IDs handled as strings throughout

### Quality
- ✅ >60% test coverage for utilities
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Lighthouse score >80

### Performance
- ✅ Initial load <3s
- ✅ Bundle size <500KB (gzipped)
- ✅ No memory leaks

---

## Timeline

```
Week 1:
  Day 1-2: Phase 1 (Backend Integration)
  Day 3: Phase 2 (UI Components)
  Day 4: Phase 3 (Auth & Routing)
  Day 5: Phase 4 start (Cleanup)

Week 2:
  Day 1-2: Phase 4 continue (Testing & Docs)
  Day 3: Phase 5 (E2E Testing & Polish)
  Day 4-5: Buffer for issues/refinement
```

---

## Next Steps

1. Review and approve task breakdown
2. Set up development environment
3. Create OPSX tasks for tracking
4. Begin Phase 1: Task 1.1
5. Daily standups to track progress
6. Weekly demos to stakeholders
