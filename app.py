from __future__ import annotations

# Веб-приложение для расчета переплаты по ипотеке.

from dataclasses import dataclass
from datetime import date
import calendar
from typing import Optional

from flask import Flask, render_template, request


app = Flask(__name__)


@dataclass
class MortgageInput:
    # Входные данные пользователя для расчета.
    principal: float
    down_payment: float
    down_payment_percent: float
    years: int
    annual_rate: float


@dataclass
class MortgageResult:
    # Результат расчета переплаты.
    overpayment: float
    total_paid: float
    monthly_payment: float
    loan_amount: float
    required_income: float
    schedule: list[dict[str, float | int]]
    total_interest: float


def calculate_mortgage(data: MortgageInput) -> MortgageResult:
    # Рассчитываем ежемесячный платеж и переплату по аннуитетной схеме.
    months = data.years * 12
    monthly_rate = data.annual_rate / 12 / 100
    # Определяем сумму первоначального взноса: фиксированная сумма или процент.
    if data.down_payment > 0:
        down_payment_value = data.down_payment
    elif data.down_payment_percent > 0:
        down_payment_value = data.principal * (data.down_payment_percent / 100)
    else:
        down_payment_value = 0.0

    loan_amount = data.principal - down_payment_value

    if months <= 0:
        raise ValueError("Срок должен быть больше нуля")
    if loan_amount <= 0:
        raise ValueError("Первоначальный взнос должен быть меньше суммы")

    if monthly_rate == 0:
        monthly_payment = loan_amount / months
    else:
        factor = (1 + monthly_rate) ** months
        monthly_payment = loan_amount * (monthly_rate * factor) / (factor - 1)

    # Банки обычно округляют ежемесячный платеж до копеек.
    monthly_payment = round(monthly_payment, 2)

    # Формируем график платежей помесячно.
    schedule: list[dict[str, float | int]] = []
    balance = loan_amount
    total_interest = 0.0

    # Стартовая дата графика: текущий день.
    start_date = date.today()

    def add_months(base_date: date, months_to_add: int) -> date:
        # Безопасно добавляем месяцы к дате, учитывая длину месяца.
        month_index = base_date.month - 1 + months_to_add
        year = base_date.year + month_index // 12
        month = month_index % 12 + 1
        last_day = calendar.monthrange(year, month)[1]
        day = min(base_date.day, last_day)
        return date(year, month, day)

    for month in range(1, months + 1):
        # Начисленные проценты за месяц.
        interest = round(balance * monthly_rate, 2) if monthly_rate > 0 else 0.0
        principal_payment = round(monthly_payment - interest, 2)

        # Корректируем последний платеж, чтобы закрыть остаток.
        if month == months:
            principal_payment = round(balance, 2)
            monthly_payment_actual = round(principal_payment + interest, 2)
        else:
            monthly_payment_actual = monthly_payment

        balance = round(balance - principal_payment, 2)
        total_interest = round(total_interest + interest, 2)

        payment_date = add_months(start_date, month - 1)

        schedule.append(
            {
                "month": month,
                "payment": monthly_payment_actual,
                "interest": interest,
                "principal": principal_payment,
                "balance": max(balance, 0.0),
                "date": payment_date.isoformat(),
            }
        )

    total_paid = round(sum(item["payment"] for item in schedule), 2)
    overpayment = round(total_interest, 2)

    # Оцениваем минимальный доход по правилу 30%.
    required_income = monthly_payment / 0.3

    return MortgageResult(
        overpayment=overpayment,
        total_paid=total_paid,
        monthly_payment=monthly_payment,
        loan_amount=loan_amount,
        required_income=required_income,
        schedule=schedule,
        total_interest=total_interest,
    )


def parse_form(form) -> MortgageInput:
    # Преобразуем входные значения из формы в числа.
    # Нормализуем ввод: пустая строка считается нулем.
    def parse_float(value: str) -> float:
        cleaned = value.replace(" ", "").replace(",", ".").strip()
        if cleaned == "":
            return 0.0
        return float(cleaned)

    def parse_int(value: str) -> int:
        cleaned = value.replace(" ", "").replace(",", ".").strip()
        if cleaned == "":
            return 0
        return int(float(cleaned))

    principal = parse_float(form.get("principal", ""))
    down_payment = parse_float(form.get("down_payment", ""))
    down_payment_percent = parse_float(form.get("down_payment_percent", ""))
    years = parse_int(form.get("years", ""))
    annual_rate = parse_float(form.get("annual_rate", ""))

    if principal <= 0:
        raise ValueError("Сумма кредита должна быть больше нуля")
    if down_payment < 0:
        raise ValueError("Первоначальный взнос не может быть отрицательным")
    if down_payment_percent < 0:
        raise ValueError("Процент первоначального взноса не может быть отрицательным")
    if down_payment_percent >= 100:
        raise ValueError("Процент первоначального взноса должен быть меньше 100")
    if down_payment > 0 and down_payment_percent > 0:
        raise ValueError("Укажите взнос либо суммой, либо процентом")
    if down_payment >= principal:
        raise ValueError("Первоначальный взнос должен быть меньше суммы")
    if years <= 0:
        raise ValueError("Срок должен быть больше нуля")
    if annual_rate < 0:
        raise ValueError("Ставка не может быть отрицательной")

    return MortgageInput(
        principal=principal,
        down_payment=down_payment,
        down_payment_percent=down_payment_percent,
        years=years,
        annual_rate=annual_rate,
    )


def format_money(value: float) -> str:
    # Форматируем число в денежный вид с пробелами.
    return f"{value:,.2f}".replace(",", " ")


@app.route("/", methods=["GET", "POST"])
def index():
    # Отображаем форму и результат расчета.
    result: Optional[MortgageResult] = None
    error: Optional[str] = None
    values = {
        "principal": "",
        "down_payment": "",
        "down_payment_percent": "",
        "years": "",
        "annual_rate": "",
    }

    if request.method == "POST":
        try:
            data = parse_form(request.form)
            result = calculate_mortgage(data)
            values = {
                "principal": request.form.get("principal", ""),
                "down_payment": request.form.get("down_payment", ""),
                "down_payment_percent": request.form.get("down_payment_percent", ""),
                "years": request.form.get("years", ""),
                "annual_rate": request.form.get("annual_rate", ""),
            }
        except (ValueError, TypeError) as exc:
            error = str(exc)

    return render_template(
        "index.html",
        result=result,
        error=error,
        values=values,
        format_money=format_money,
    )


if __name__ == "__main__":
    # Локальный запуск приложения.
    app.run(debug=True, port=5050)
