import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./pages/DirectoryPage", () => ({
  DirectoryPage: () => <div>Employee directory</div>,
}));

function renderApp(initialPath = "/") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App", () => {
  test("renders directory by default", () => {
    renderApp("/");
    expect(screen.getByText("Employee directory")).toBeTruthy();
  });
});
