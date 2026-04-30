import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "../app/login/page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: pushMock,
    }),
}));

vi.mock("../app/login/login.module.css", () => ({
    default: new Proxy(
        {},
        {
            get: (_, prop) => String(prop),
        }
    ),
}));

describe("LoginPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:8080";

        global.fetch = vi.fn();
    });

    it("renders login form", () => {
        render(<LoginPage />);

        expect(screen.getByText("Вход")).toBeInTheDocument();
        expect(screen.getByText("E-mail")).toBeInTheDocument();
        expect(screen.getByText("Пароль")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeInTheDocument();
    });

    it("shows error when fields are empty", async () => {
        render(<LoginPage />);

        fireEvent.click(screen.getByRole("button", { name: "Войти" }));

        expect(await screen.findByText("Введите e-mail и пароль")).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("logs in successfully and redirects to feed", async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "test-token" }),
        } as Response);

        render(<LoginPage />);

        fireEvent.change(screen.getByLabelText("E-mail"), {
            target: { value: " TEST@MAIL.COM " },
        });

        fireEvent.change(screen.getByLabelText("Пароль"), {
            target: { value: "123456" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Войти" }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "http://localhost:8080/auth/login",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "test@mail.com",
                        password: "123456",
                    }),
                })
            );
        });

        expect(localStorage.getItem("token")).toBe("test-token");
        expect(pushMock).toHaveBeenCalledWith("/feed");
    });

    it("shows backend error message", async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: "Неверный пароль" }),
        } as Response);

        render(<LoginPage />);

        fireEvent.change(screen.getByLabelText("E-mail"), {
            target: { value: "test@mail.com" },
        });

        fireEvent.change(screen.getByLabelText("Пароль"), {
            target: { value: "wrong" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Войти" }));

        expect(await screen.findByText("Неверный пароль")).toBeInTheDocument();
        expect(pushMock).not.toHaveBeenCalledWith("/feed");
    });

    it("shows network error", async () => {
        vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

        render(<LoginPage />);

        fireEvent.change(screen.getByLabelText("E-mail"), {
            target: { value: "test@mail.com" },
        });

        fireEvent.change(screen.getByLabelText("Пароль"), {
            target: { value: "123456" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Войти" }));

        expect(await screen.findByText("Не удалось связаться с сервером")).toBeInTheDocument();
    });

    it("redirects to forgot password page", () => {
        render(<LoginPage />);

        fireEvent.click(screen.getByRole("button", { name: "Забыли пароль?" }));

        expect(pushMock).toHaveBeenCalledWith("/forgot-password");
    });

    it("redirects to register page", () => {
        render(<LoginPage />);

        fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

        expect(pushMock).toHaveBeenCalledWith("/register");
    });
});