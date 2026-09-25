import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderAdvisorMarkdown } from "./markdown";

describe("renderAdvisorMarkdown", () => {
  it("renders bold text without leaking raw asterisks", () => {
    render(<div>{renderAdvisorMarkdown("Esto es **importante** para ti")}</div>);
    const strong = screen.getByText("importante");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("renders an unordered list from '- ' lines", () => {
    render(<div>{renderAdvisorMarkdown("Beneficios:\n- Duerme mejor\n- Menos estrés")}</div>);
    expect(screen.getByText("Duerme mejor").closest("li")).toBeInTheDocument();
    expect(screen.getByText("Menos estrés").closest("li")).toBeInTheDocument();
  });

  it("renders an ordered list from '1. ' lines", () => {
    render(<div>{renderAdvisorMarkdown("1. Primero\n2. Segundo")}</div>);
    const list = screen.getByText("Primero").closest("ol");
    expect(list).toBeInTheDocument();
  });

  it("preserves line breaks inside a paragraph", () => {
    const { container } = render(<div>{renderAdvisorMarkdown("Línea uno\nLínea dos")}</div>);
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("never injects raw HTML", () => {
    render(<div>{renderAdvisorMarkdown("<script>alert(1)</script>")}</div>);
    expect(document.querySelector("script")).not.toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  });
});
