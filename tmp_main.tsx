import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=612d9155"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=612d9155"; const React = __vite__cjsImport1_react.__esModule ? __vite__cjsImport1_react.default : __vite__cjsImport1_react;
import __vite__cjsImport2_reactDom_client from "/node_modules/.vite/deps/react-dom_client.js?v=28d998f6"; const createRoot = __vite__cjsImport2_reactDom_client["createRoot"];
import App from "/src/App.tsx";
import "/src/index.css";
import { AuthProvider } from "/src/contexts/AuthContext.tsx";
import { UsersProvider } from "/src/contexts/UsersContext.tsx";
import { QueryClient, QueryClientProvider } from "/node_modules/.vite/deps/@tanstack_react-query.js?v=10e73d19";
const queryClient = new QueryClient();
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento root não encontrado.");
const root = createRoot(rootElement);
root.render(
  /* @__PURE__ */ jsxDEV(React.StrictMode, { children: /* @__PURE__ */ jsxDEV(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxDEV(AuthProvider, { children: /* @__PURE__ */ jsxDEV(UsersProvider, { children: /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/main.tsx",
    lineNumber: 24,
    columnNumber: 11
  }, this) }, void 0, false, {
    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/main.tsx",
    lineNumber: 23,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/main.tsx",
    lineNumber: 21,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/main.tsx",
    lineNumber: 20,
    columnNumber: 5
  }, this) }, void 0, false, {
    fileName: "C:/Users/frant/.antigravity/qualia-task-flow/src/main.tsx",
    lineNumber: 19,
    columnNumber: 3
  }, this)
);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBdUJVO0FBdEJWLE9BQU9BLFdBQVc7QUFFbEIsU0FBU0Msa0JBQWtCO0FBQzNCLE9BQU9DLFNBQVM7QUFDaEIsT0FBTztBQUNQLFNBQVNDLG9CQUFvQjtBQUM3QixTQUFTQyxxQkFBcUI7QUFDOUIsU0FBU0MsYUFBYUMsMkJBQTJCO0FBRWpELE1BQU1DLGNBQWMsSUFBSUYsWUFBWTtBQUVwQyxNQUFNRyxjQUFjQyxTQUFTQyxlQUFlLE1BQU07QUFDbEQsSUFBSSxDQUFDRixZQUFhLE9BQU0sSUFBSUcsTUFBTSwrQkFBK0I7QUFFakUsTUFBTUMsT0FBT1gsV0FBV08sV0FBVztBQUVuQ0ksS0FBS0M7QUFBQUEsRUFDSCx1QkFBQyxNQUFNLFlBQU4sRUFDQyxpQ0FBQyx1QkFBb0IsUUFBUU4sYUFDM0IsaUNBQUMsZ0JBRUMsaUNBQUMsaUJBQ0MsaUNBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQUksS0FETjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBRUEsS0FKRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBS0EsS0FORjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBT0EsS0FSRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBU0E7QUFDRiIsIm5hbWVzIjpbIlJlYWN0IiwiY3JlYXRlUm9vdCIsIkFwcCIsIkF1dGhQcm92aWRlciIsIlVzZXJzUHJvdmlkZXIiLCJRdWVyeUNsaWVudCIsIlF1ZXJ5Q2xpZW50UHJvdmlkZXIiLCJxdWVyeUNsaWVudCIsInJvb3RFbGVtZW50IiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIkVycm9yIiwicm9vdCIsInJlbmRlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJtYWluLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBzcmMvbWFpbi50c3hcclxuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcclxuXHJcbmltcG9ydCB7IGNyZWF0ZVJvb3QgfSBmcm9tICdyZWFjdC1kb20vY2xpZW50JztcclxuaW1wb3J0IEFwcCBmcm9tICcuL0FwcC50c3gnO1xyXG5pbXBvcnQgJy4vaW5kZXguY3NzJztcclxuaW1wb3J0IHsgQXV0aFByb3ZpZGVyIH0gZnJvbSAnLi9jb250ZXh0cy9BdXRoQ29udGV4dCc7XHJcbmltcG9ydCB7IFVzZXJzUHJvdmlkZXIgfSBmcm9tICcuL2NvbnRleHRzL1VzZXJzQ29udGV4dCc7IC8vIDwtLSBJTVBPUlRFIE8gTk9WTyBQUk9WSURFUlxyXG5pbXBvcnQgeyBRdWVyeUNsaWVudCwgUXVlcnlDbGllbnRQcm92aWRlciB9IGZyb20gJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSc7XHJcblxyXG5jb25zdCBxdWVyeUNsaWVudCA9IG5ldyBRdWVyeUNsaWVudCgpO1xyXG5cclxuY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJvb3RcIik7XHJcbmlmICghcm9vdEVsZW1lbnQpIHRocm93IG5ldyBFcnJvcihcIkVsZW1lbnRvIHJvb3QgbsOjbyBlbmNvbnRyYWRvLlwiKTtcclxuXHJcbmNvbnN0IHJvb3QgPSBjcmVhdGVSb290KHJvb3RFbGVtZW50KTtcclxuXHJcbnJvb3QucmVuZGVyKFxyXG4gIDxSZWFjdC5TdHJpY3RNb2RlPlxyXG4gICAgPFF1ZXJ5Q2xpZW50UHJvdmlkZXIgY2xpZW50PXtxdWVyeUNsaWVudH0+XHJcbiAgICAgIDxBdXRoUHJvdmlkZXI+XHJcbiAgICAgICAgey8qIC0tLSBFTlZPTFZBIE8gQVBQIENPTSBPIFVTRVJTIFBST1ZJREVSIC0tLSAqL31cclxuICAgICAgICA8VXNlcnNQcm92aWRlcj5cclxuICAgICAgICAgIDxBcHAgLz5cclxuICAgICAgICA8L1VzZXJzUHJvdmlkZXI+XHJcbiAgICAgIDwvQXV0aFByb3ZpZGVyPlxyXG4gICAgPC9RdWVyeUNsaWVudFByb3ZpZGVyPlxyXG4gIDwvUmVhY3QuU3RyaWN0TW9kZT5cclxuKTsiXSwiZmlsZSI6IkM6L1VzZXJzL2ZyYW50Ly5hbnRpZ3Jhdml0eS9xdWFsaWEtdGFzay1mbG93L3NyYy9tYWluLnRzeCJ9