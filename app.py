import re
import unicodedata
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
st.set_page_config(page_title="Dashboard chauffeurs", page_icon="🚚", layout="wide")

DATA_DIR = Path("data")
EXPECTED_YEAR = 2025
YEAR_START = date(EXPECTED_YEAR, 1, 1)
YEAR_END = date(EXPECTED_YEAR, 12, 31)
SDV_DRIVER_MAP = {
    "SDV_1.csv": {"sdv_label": "SDV 1", "driver_name": "AMARA"},
    "SDV_2.csv": {"sdv_label": "SDV 2", "driver_name": "BRAHIMA"},
    "SDV_3.csv": {"sdv_label": "SDV 3", "driver_name": "SORO"},
}
PALETTE = {
    "bg": "#f8fafc",
    "card": "#ffffff",
    "primary": "#4f46e5",
    "secondary": "#64748b",
    "accent": "#f59e0b",
    "border": "#f1f5f9",
    "text": "#1e293b",
    "teal": "#14b8a6"
}

MONTH_NAMES = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def normalize_columns(columns: List[str]) -> List[str]:
    cleaned = []
    for col in columns:
        text = str(col or "").strip().lower()
        text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
        text = re.sub(r"[^a-z0-9]+", "_", text)
        cleaned.append(text.strip("_"))
    return cleaned


def parse_number(value) -> float:
    """Convert messy numeric strings (spaces, NBSP, comma decimal, 'k') to float."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    if isinstance(value, (int, float, np.number)):
        return float(value)
    text = str(value).strip()
    if not text:
        return np.nan
    text = text.replace("\u202f", "").replace("\xa0", "").replace(" ", "")
    multiplier = 1
    if text.lower().endswith("k"):
        multiplier = 1000
        text = text[:-1]
    text = text.replace(",", ".")
    text = re.sub(r"[^0-9.\-]", "", text)
    if text.count(".") > 1:
        parts = text.split(".")
        text = parts[0] + "." + "".join(parts[1:])
    try:
        return float(text) * multiplier
    except ValueError:
        return np.nan


def parse_french_date_value(value) -> pd.Timestamp:
    """Parse strictly `JJ/MM/YYYY` and keep only dates from 2025."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return pd.NaT
    if isinstance(value, pd.Timestamp):
        value = value.strftime("%d/%m/%Y")

    text = str(value).strip()
    if not text:
        return pd.NaT

    parts = text.split("/")
    if len(parts) != 3:
        return pd.NaT

    day_text, month_text, year_text = [part.strip() for part in parts]
    if len(day_text) != 2 or len(month_text) != 2 or len(year_text) != 4:
        return pd.NaT
    if not day_text.isdigit() or not month_text.isdigit() or not year_text.isdigit():
        return pd.NaT

    day = int(day_text)
    month = int(month_text)
    year = int(year_text)
    if year != EXPECTED_YEAR:
        return pd.NaT

    try:
        return pd.Timestamp(year=year, month=month, day=day)
    except ValueError:
        return pd.NaT


def parse_french_date_series(series: pd.Series) -> pd.Series:
    return series.apply(parse_french_date_value)


def month_label(period: Optional[pd.Period]) -> str:
    if period is None or pd.isna(period):
        return "Période inconnue"
    idx = int(period.month) - 1
    name = MONTH_NAMES[idx].capitalize() if 0 <= idx < 12 else period.strftime("%b")
    return f"{name} {period.year}"


def extract_driver_from_name(name: str) -> str:
    match = re.search(r"(amara|brahima|soro)", name, flags=re.IGNORECASE)
    return match.group(1).upper() if match else "INCONNU"


def clean_driver_name(value: str) -> str:
    text = str(value or "").strip().upper()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    for known_driver in ["AMARA", "BRAHIMA", "SORO"]:
        if known_driver in text:
            return known_driver
    return text or "INCONNU"


def get_sdv_metadata(path: Path) -> Dict[str, str]:
    default_label = path.stem.replace("_", " ").upper()
    default_driver = extract_driver_from_name(path.stem)
    return SDV_DRIVER_MAP.get(
        path.name,
        {"sdv_label": default_label, "driver_name": default_driver},
    )


def detect_header_row(df: pd.DataFrame) -> pd.DataFrame:
    """If many 'Unnamed' columns, treat first row as header."""
    if df.columns.size == 0 or df.shape[0] == 0:
        return df
    unnamed_ratio = np.mean(df.columns.astype(str).str.contains("unnamed", case=False))
    if unnamed_ratio > 0.5:
        header_candidate = df.iloc[0]
        non_empty = header_candidate.fillna("").astype(str)
        if (non_empty != "").sum() >= df.columns.size / 2:
            df = df.iloc[1:].copy()
            df.columns = header_candidate
    return df


def detect_date_column(df: pd.DataFrame) -> Tuple[str, pd.Series]:
    best_col = df.columns[0]
    best_score = -1.0
    best_parsed = None
    for col in df.columns:
        parsed = parse_french_date_series(df[col])
        score = parsed.notna().mean()
        if score > best_score:
            best_col, best_score, best_parsed = col, score, parsed
    return best_col, best_parsed


def sum_columns(df: pd.DataFrame, patterns: List[str]) -> pd.Series:
    cols = [c for c in df.columns if any(re.search(p, c) for p in patterns)]
    if not cols:
        return pd.Series(np.nan, index=df.index)
    return df[cols].applymap(parse_number).sum(axis=1, skipna=True)


def count_non_empty_rows(df: pd.DataFrame) -> pd.Series:
    text_df = df.fillna("").astype(str)
    text_df = text_df.apply(lambda col: col.str.strip())
    return text_df.ne("").any(axis=1)


# ---------------------------------------------------------------------------
# Loading & cleaning
# ---------------------------------------------------------------------------
def read_csv_resilient(path: Path) -> pd.DataFrame:
    encodings = ["utf-8-sig", "utf-8", "latin-1"]
    seps = [";", None, ","]
    for enc in encodings:
        for sep in seps:
            try:
                return pd.read_csv(path, sep=sep, engine="python", encoding=enc, dtype=str)
            except Exception:
                continue
    return pd.DataFrame()


def clean_csv(path: Path) -> Tuple[pd.DataFrame, Dict[str, object]]:
    raw = read_csv_resilient(path)
    if raw.empty:
        return pd.DataFrame(), {
            "source_file": path.name,
            "sdv_option": get_sdv_metadata(path)["sdv_label"],
            "driver_name": get_sdv_metadata(path)["driver_name"],
            "total_rows": 0,
            "valid_rows": 0,
            "invalid_date_rows": 0,
            "status": "Fichier vide ou illisible",
        }

    metadata = get_sdv_metadata(path)
    raw = raw.dropna(how="all")
    raw = raw.dropna(axis=1, how="all")
    raw = detect_header_row(raw)
    raw.columns = normalize_columns(raw.columns)
    raw = raw.loc[:, ~raw.columns.duplicated()]

    driver_guess = metadata["driver_name"]
    driver_col = next((c for c in raw.columns if "driver" in c or "chauffeur" in c), None)

    if driver_col:
        for val in raw[driver_col].dropna().astype(str):
            if pd.isna(parse_french_date_value(val)):
                candidate = clean_driver_name(val)
                if candidate != "INCONNU":
                    driver_guess = candidate
                break

    date_col, parsed_dates = detect_date_column(raw)
    non_empty_rows = count_non_empty_rows(raw)
    invalid_date_rows = int((non_empty_rows & parsed_dates.isna()).sum())

    # If the top cell of the date column is non-date, use it as driver hint
    top_val = raw[date_col].iloc[0]
    if pd.isna(parse_french_date_value(top_val)) and isinstance(top_val, str) and top_val.strip():
        candidate = clean_driver_name(top_val)
        if candidate != "INCONNU":
            driver_guess = candidate

    raw["date"] = parsed_dates
    raw = raw[raw["date"].notna()].copy()
    if raw.empty:
        return pd.DataFrame(), {
            "source_file": path.name,
            "sdv_option": metadata["sdv_label"],
            "driver_name": metadata["driver_name"],
            "total_rows": int(non_empty_rows.sum()),
            "valid_rows": 0,
            "invalid_date_rows": invalid_date_rows,
            "status": "Aucune date valide",
        }

    # Expose stable ISO dates and date parts after strict French parsing.
    raw["date_iso"] = raw["date"].dt.strftime("%Y-%m-%d")
    raw["day"] = raw["date"].dt.day
    raw["year"] = raw["date"].dt.year
    raw["month"] = raw["date"].dt.month
    raw["period"] = raw["date"].dt.to_period("M")

    if driver_col and driver_col in raw:
        raw["driver_name"] = raw[driver_col].ffill().fillna(driver_guess)
    else:
        raw["driver_name"] = driver_guess
    raw["driver_name"] = raw["driver_name"].apply(clean_driver_name)

    # The SDV file naming is the business source of truth for chauffeur assignment.
    raw["driver_name"] = metadata["driver_name"]
    raw["sdv_option"] = metadata["sdv_label"]

    start_col = next((c for c in raw.columns if c.startswith("start")), None)
    dest_col = next((c for c in raw.columns if c.startswith("destination")), None)
    raw["start"] = raw[start_col] if start_col else "Start inconnue"
    raw["destination"] = raw[dest_col] if dest_col else "Destination inconnue"
    raw["start"] = raw["start"].fillna("Start inconnue")
    raw["destination"] = raw["destination"].fillna("Destination inconnue")

    raw["fuel_cfa"] = sum_columns(raw, [r"fuel"]).fillna(0)
    raw["road_cfa"] = sum_columns(raw, [r"road", r"peage", r"toll", r"police"]).fillna(0)

    expense_total_col = next((c for c in raw.columns if re.search(r"total_expense", c)), None)
    raw["expense_total"] = raw[expense_total_col].apply(parse_number) if expense_total_col else np.nan

    other_exp = sum_columns(raw, [r"expense", r"bonus", r"food", r"helper", r"personal", r"company"]).fillna(0)
    raw["expense_cfa"] = np.where(
        raw["expense_total"].notna(),
        raw["expense_total"] - (raw["fuel_cfa"] + raw["road_cfa"]),
        other_exp,
    )
    raw["expense_cfa"] = raw["expense_cfa"].clip(lower=0)
    raw["charges_cfa"] = raw["fuel_cfa"] + raw["road_cfa"] + raw["expense_cfa"]

    amount_col = next((c for c in raw.columns if re.search(r"(total_gross|gross|amount|montant|money_received)", c)), None)
    raw["amount_cfa"] = raw[amount_col].apply(parse_number).fillna(0) if amount_col else 0.0

    # Calcul forcé pour garantir la cohérence mathématique du dashboard
    raw["net_cfa"] = raw["amount_cfa"] - raw["charges_cfa"]

    raw["tonnage_t"] = sum_columns(raw, [r"tonnage"]).fillna(0)
    raw["route_km"] = sum_columns(raw, [r"km$", r"_km"]).fillna(0)

    raw["source_file"] = path.name

    keep_cols = [
        "date",
        "date_iso",
        "day",
        "year",
        "month",
        "period",
        "driver_name",
        "sdv_option",
        "start",
        "destination",
        "fuel_cfa",
        "road_cfa",
        "expense_cfa",
        "charges_cfa",
        "amount_cfa",
        "net_cfa",
        "tonnage_t",
        "route_km",
        "source_file",
    ]
    keep_cols = [c for c in keep_cols if c in raw.columns]
    return raw[keep_cols], {
        "source_file": path.name,
        "sdv_option": metadata["sdv_label"],
        "driver_name": metadata["driver_name"],
        "total_rows": int(non_empty_rows.sum()),
        "valid_rows": int(raw.shape[0]),
        "invalid_date_rows": invalid_date_rows,
        "status": "OK" if invalid_date_rows == 0 else "Dates invalides ignorées",
    }


def file_signatures(files: List[Path]) -> Tuple[Tuple[str, float, int], ...]:
    return tuple((f.name, f.stat().st_mtime, f.stat().st_size) for f in files)


@st.cache_data(show_spinner=False)
def load_data(signatures: Tuple[Tuple[str, float, int], ...]) -> Tuple[pd.DataFrame, pd.DataFrame]:
    frames: List[pd.DataFrame] = []
    reports: List[Dict[str, object]] = []
    for name, *_ in signatures:
        path = DATA_DIR / name
        cleaned, report = clean_csv(path)
        reports.append(report)
        if not cleaned.empty:
            frames.append(cleaned)
    report_df = pd.DataFrame(reports)
    if not frames:
        return pd.DataFrame(), report_df
    df = pd.concat(frames, ignore_index=True)
    df = df.sort_values("date")
    return df, report_df


# ---------------------------------------------------------------------------
# Filters & metrics
# ---------------------------------------------------------------------------
def validate_period_selection(
    month: Optional[int],
    year: int,
    start: pd.Timestamp,
    end: pd.Timestamp,
) -> List[Tuple[str, str]]:
    messages: List[Tuple[str, str]] = []

    if start > end:
        messages.append(("error", "La date de fin doit etre posterieure ou egale a la date de debut."))
        return messages

    if start.year != EXPECTED_YEAR or end.year != EXPECTED_YEAR:
        messages.append(("error", f"La plage de dates doit rester dans l'annee {EXPECTED_YEAR}."))
        return messages

    if month is not None:
        if start.month != month or end.month != month or start.year != end.year:
            messages.append(
                (
                    "warning",
                    "La plage de dates depasse le mois selectionne. Les lignes hors mois seront ignorees.",
                )
            )

    if start.year != year or end.year != year:
        messages.append(
            (
                "warning",
                "La plage de dates depasse l'annee selectionnee. Les lignes hors annee seront ignorees.",
            )
        )

    return messages


def apply_filters(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Optional[str]]]:
    sdv_options = sorted(df["sdv_option"].dropna().unique().tolist())
    drivers = sorted(df["driver_name"].dropna().unique().tolist())
    months = list(range(1, 13))
    years = [EXPECTED_YEAR]

    data_min_date = max(df["date"].min().date(), YEAR_START)
    data_max_date = min(df["date"].max().date(), YEAR_END)

    col_f1, col_f2, col_f3, col_f4, col_f5 = st.columns([1.0, 1.0, 0.8, 0.8, 1.2])
    with col_f1:
        sdv_option = st.selectbox("SDV", ["Tous"] + sdv_options, index=0)
    with col_f2:
        allowed_drivers = drivers
        if sdv_option != "Tous":
            allowed_drivers = sorted(df.loc[df["sdv_option"] == sdv_option, "driver_name"].dropna().unique().tolist())
        driver = st.selectbox("Chauffeur", ["Tous"] + allowed_drivers, index=0)
    with col_f3:
        month = st.selectbox(
            "Mois",
            [None] + months,
            index=0,
            format_func=lambda m: "Tous" if m is None else MONTH_NAMES[int(m) - 1].capitalize(),
        )
    with col_f5:
        date_range = st.date_input(
            "Plage de dates",
            value=(data_min_date, data_max_date),
            min_value=YEAR_START,
            max_value=YEAR_END,
        )

    year = EXPECTED_YEAR
    filtered = df.copy()
    period_messages: List[Tuple[str, str]] = []
    ignored_rows = 0

    if isinstance(date_range, tuple) and len(date_range) == 2:
        start, end = pd.to_datetime(date_range[0]), pd.to_datetime(date_range[1])
    else:
        start = pd.to_datetime(data_min_date)
        end = pd.to_datetime(data_max_date)

    start = max(start, pd.Timestamp(YEAR_START))
    end = min(end, pd.Timestamp(YEAR_END))

    period_messages.extend(validate_period_selection(month, year, start, end))

    if sdv_option != "Tous":
        filtered = filtered[filtered["sdv_option"] == sdv_option]
    if driver != "Tous":
        filtered = filtered[filtered["driver_name"] == driver]

    period_scope_rows = int(filtered.shape[0])
    if month is not None:
        filtered = filtered[filtered["month"] == month]
    filtered = filtered[filtered["year"] == year]
    filtered = filtered[(filtered["date"] >= start) & (filtered["date"] <= end)]
    ignored_rows = max(period_scope_rows - int(filtered.shape[0]), 0)

    selected_period = "Toutes périodes"
    if month is not None and year is not None:
        selected_period = f"{MONTH_NAMES[month - 1].capitalize()} {year}"
    elif month is not None:
        selected_period = MONTH_NAMES[month - 1].capitalize()
    else:
        selected_period = str(year)

    linked_driver = "Tous chauffeurs" if driver == "Tous" else driver
    if sdv_option != "Tous" and driver == "Tous":
        sdv_driver = filtered["driver_name"].dropna().unique().tolist()
        if len(sdv_driver) == 1:
            linked_driver = sdv_driver[0]

    return filtered, {
        "driver": linked_driver,
        "sdv_option": sdv_option,
        "period": selected_period,
        "date_range": date_range,
        "ignored_rows": ignored_rows,
        "messages": period_messages,
        "start": start,
        "end": end,
    }


def compute_metrics(df: pd.DataFrame) -> Dict[str, object]:
    monthly = (
        df.groupby("period")
        .agg(
            net=("net_cfa", "sum"),
            amount=("amount_cfa", "sum"),
            fuel=("fuel_cfa", "sum"),
            road=("road_cfa", "sum"),
            expense=("expense_cfa", "sum"),
            tonnage=("tonnage_t", "sum"),
            trips=("date", "count"),
        )
        .reset_index()
        .sort_values("period")
    )

    last_period = monthly["period"].iloc[-1] if not monthly.empty else None
    prev_period = monthly["period"].iloc[-2] if len(monthly) >= 2 else None

    total_net = df["net_cfa"].sum()
    total_amount = df["amount_cfa"].sum()
    total_costs = df["charges_cfa"].sum()
    trips = int(df.shape[0])
    tonnage_total = df["tonnage_t"].sum()

    last_net = monthly.loc[monthly["period"] == last_period, "net"].sum() if last_period is not None else np.nan
    prev_net = monthly.loc[monthly["period"] == prev_period, "net"].sum() if prev_period is not None else np.nan
    delta_vs_prev = ((last_net - prev_net) / prev_net * 100) if (pd.notna(prev_net) and prev_net != 0) else np.nan

    metrics = {
        "total_net": total_net,
        "current_net": last_net,
        "total_amount": total_amount,
        "total_costs": total_costs,
        "trips": trips,
        "tonnage_total": tonnage_total,
        "net_margin": (total_net / total_amount * 100) if total_amount else np.nan,
        "cost_share": (total_costs / total_amount * 100) if total_amount else np.nan,
        "avg_net_trip": (total_net / trips) if trips else np.nan,
        "avg_ton_trip": (tonnage_total / trips) if trips else np.nan,
        "last_month_label": month_label(last_period),
        "last_month_net": last_net,
        "delta_vs_prev": delta_vs_prev,
        "breakdown": {
            "Fuel": df["fuel_cfa"].sum(),
            "Péage / Police": df["road_cfa"].sum(),
            "Dépenses": df["expense_cfa"].sum(),
        },
        "monthly": monthly,
    }
    return metrics


def build_charts(metrics: Dict[str, object]) -> Dict[str, go.Figure]:
    monthly = metrics["monthly"]
    figs: Dict[str, go.Figure] = {
        "net_trend": go.Figure(),
        "cost_donut": go.Figure(),
        "amount_net": go.Figure(),
        "tonnage_trips": go.Figure(),
    }
    if monthly.empty:
        return figs

    labels = [month_label(p) for p in monthly["period"]]

    # Net trend
    net_trend = go.Figure(
        go.Scatter(
            x=monthly["period"].dt.to_timestamp(),
            y=monthly["net"],
            mode="lines+markers",
            line=dict(color=PALETTE["teal"], width=3),
            name="Net",
        )
    )
    net_trend.update_layout(
        height=340,
        margin=dict(t=30, b=10, l=10, r=10),
        yaxis=dict(gridcolor=PALETTE["border"], tickformat=",.0f"),
        xaxis=dict(showgrid=False),
        showlegend=False,
    )
    figs["net_trend"] = net_trend

    # Cost donut
    breakdown = metrics["breakdown"]
    donut = go.Figure(
        go.Pie(
            labels=list(breakdown.keys()),
            values=list(breakdown.values()),
            hole=0.65,
            marker=dict(colors=[PALETTE["primary"], PALETTE["accent"], "#94a3b8"]),
            textinfo="label+percent",
        )
    )
    donut.update_layout(height=320, margin=dict(t=30, b=10, l=10, r=10), showlegend=False)
    figs["cost_donut"] = donut

    # Amount vs Net
    amount_net = go.Figure()
    amount_net.add_bar(
        x=labels,
        y=monthly["amount"],
        name="Montant facture",
        marker_color=PALETTE["primary"],
        opacity=0.9,
    )
    amount_net.add_trace(
        go.Scatter(
            x=labels,
            y=monthly["net"],
            name="Net",
            mode="lines+markers",
            marker_color=PALETTE["accent"],
            yaxis="y2",
        )
    )
    amount_net.update_layout(
        height=320,
        margin=dict(t=30, b=10, l=10, r=10),
        yaxis=dict(tickformat=",.0f"),
        yaxis2=dict(title="Net", overlaying="y", side="right", tickformat=",.0f"),
        legend=dict(orientation="h"),
    )
    figs["amount_net"] = amount_net

    # Tonnage & trips
    tonnage_trips = go.Figure()
    tonnage_trips.add_bar(
        x=labels,
        y=monthly["tonnage"],
        name="Tonnage",
        marker_color="#94a3b8",
        opacity=0.9,
    )
    tonnage_trips.add_trace(
        go.Scatter(
            x=labels,
            y=monthly["trips"],
            name="Voyages",
            mode="lines+markers",
            marker_color=PALETTE["primary"],
            yaxis="y2",
        )
    )
    tonnage_trips.update_layout(
        height=320,
        margin=dict(t=30, b=10, l=10, r=10),
        yaxis=dict(tickformat=",.0f"),
        yaxis2=dict(title="Voyages", overlaying="y", side="right", tickformat=",.0f"),
        legend=dict(orientation="h"),
    )
    figs["tonnage_trips"] = tonnage_trips

    return figs


# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------
def inject_style():
    st.markdown(
        f"""
        <style>
        body {{
            background-color: {PALETTE['bg']};
            color: {PALETTE['text']};
        }}
        .sidebar-card {{
            background: {PALETTE['card']};
            border-radius: 12px;
            padding: 20px;
            border: 1px solid {PALETTE['border']};
        }}
        .kpi-card {{
            background: #fdfdfd;
            border-bottom: 2px solid {PALETTE['border']};
            padding: 12px 0;
            margin-bottom: 15px;
        }}
        .kpi-label {{ font-size: 12px; color: {PALETTE['secondary']}; text-transform: uppercase; letter-spacing: 0.5px; }}
        .kpi-value {{ font-size: 24px; font-weight: 700; color: {PALETTE['primary']}; margin: 0; }}
        .kpi-hint {{ font-size: 11px; color: {PALETTE['secondary']}; margin-top: 4px; }}
        .card {{
            background: {PALETTE['card']};
            border-radius: 12px;
            border: 1px solid {PALETTE['border']};
            padding: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }}
        .pill {{
            display:inline-block;
            padding:4px 12px;
            border-radius:20px;
            background:#eff6ff;
            color:{PALETTE['primary']};
            font-weight:500;
            border:1px solid rgba(14,154,140,0.25);
            margin-right:8px;
            margin-bottom:6px;
            font-size:14px;
        }}
        .stat {{
            padding: 12px;
            border-radius: 12px;
            border: 1px dashed {PALETTE['border']};
            background: #f7f9fb;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def format_currency(value: float) -> str:
    if value is None or pd.isna(value):
        return "0 CFA"
    return f"{value:,.0f} CFA".replace(",", " ")


def format_number(value: float, decimals: int = 0) -> str:
    if value is None or pd.isna(value):
        value = 0
    return f"{value:,.{decimals}f}".replace(",", " ")


def kpi_card(title: str, value: str, hint: Optional[str] = None):
    st.markdown(
        f"""
        <div class="kpi-card">
            <div class="kpi-label">{title}</div>
            <div class="kpi-value">{value}</div>
            {'<div class="kpi-hint">'+hint+'</div>' if hint else ''}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_investment_page():
    """Affiche l'annonce pour l'opportunité d'investissement à Sikensi."""
    st.title("💰 Opportunité d'Investissement Immobilière")
    st.subheader("Sikensi : 30 Hectares avec exploitation d'hévéa")
    
    st.markdown(
        """
        <div class='card'>
            <h3>Description du projet</h3>
            <p>Opportunité d'investissement exceptionnelle à saisir : 30 hectares stratégiquement situés à <b>Sikensi</b>, 
            sur l'axe Abidjan-Yamoussoukro (à seulement 45 minutes d'Abidjan). 🚔</p>
            <p>Le site comprend déjà <b>12 hectares d'hévéa plantés</b>, offrant un potentiel de rendement immédiat.</p>
            <p><i>Idéal pour : Exploitation agricole, projet agro-industriel ou développement immobilier.</i></p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.write("")
    
    c1, c2, c3 = st.columns(3)
    with c1:
        kpi_card("Superficie Totale", "30 Hectares", "Zone stratégique")
    with c2:
        kpi_card("Culture existante", "12 Ha d'Hévéa", "Déjà plantés")
    with c3:
        kpi_card("Prix Total", "600 Millions FCFA", "20 000 FCFA / m²")

    st.write("")

    col_media, col_contact = st.columns([2, 1])
    
    with col_media:
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.subheader("🖼️ Visuels du site & Documents")
        
        # Affichage d'une carte centrée sur Sikensi
        map_data = pd.DataFrame({'lat': [5.6776], 'lon': [-4.5758]})
        st.map(map_data, zoom=11)
        
        st.info("💡 Conseil : Ajoutez vos photos du terrain et l'extrait topo ici pour rassurer les investisseurs.")
        st.markdown("</div>", unsafe_allow_html=True)

    with col_contact:
        st.markdown("<div class='card' style='background-color:#f0f9ff;'>", unsafe_allow_html=True)
        st.subheader("📞 Nous contacter")
        st.write("Pour toute visite ou information complémentaire, contactez directement :")
        st.markdown("📱 **05-55-75-36-66**")
        st.markdown("📱 **01-41-20-00-06**")
        st.success("Prix à discuter directement avec le propriétaire.")
        st.markdown("</div>", unsafe_allow_html=True)
        
        st.write("")
        with st.form("contact_form"):
            st.write("📩 **Envoyer un message d'intérêt**")
            user_name = st.text_input("Nom complet")
            user_phone = st.text_input("Votre numéro de téléphone")
            submit = st.form_submit_button("Je suis intéressé")


# ---------------------------------------------------------------------------
# Main app
# ---------------------------------------------------------------------------
def main():
    inject_style()
    DATA_DIR.mkdir(exist_ok=True)

    # Menu de navigation
    menu = st.sidebar.radio("Navigation", ["Dashboard Chauffeurs", "Investissement Sikensi"])
    
    if menu == "Investissement Sikensi":
        render_investment_page()
        return

    files = sorted(DATA_DIR.glob("SDV_*.csv"))
    if not files:
        st.error("Aucun fichier CSV trouvé dans /data (attendu : SDV_1.csv, SDV_2.csv, SDV_3.csv).")
        return

    signatures = file_signatures(files)
    df, validation_report = load_data(signatures)
    if df.empty:
        st.error("Les fichiers CSV sont présents mais aucune ligne exploitable après nettoyage.")
        if not validation_report.empty:
            st.dataframe(validation_report, use_container_width=True)
        return

    st.title("📊 Synthèse d'Activité")
    st.write("Les KPI et graphiques se recalculent dès que vous ajustez les filtres.")

    chauffeur_tab, data_tab = st.tabs(["Chauffeur", "Données"])

    with chauffeur_tab:
        filtered, filters_info = apply_filters(df)
        for level, message in filters_info["messages"]:
            if level == "error":
                st.error(message)
            elif level == "warning":
                st.warning(message)
            else:
                st.info(message)

        if filters_info["ignored_rows"] > 0:
            st.info(f"{filters_info['ignored_rows']} ligne(s) hors periode ont ete ignorees.")

        invalid_date_total = int(validation_report["invalid_date_rows"].sum()) if not validation_report.empty else 0
        if invalid_date_total > 0:
            st.warning(f"{invalid_date_total} ligne(s) avec date invalide ont ete ignorees lors du chargement des fichiers SDV.")

        if filtered.empty:
            st.warning("Aucun résultat pour ces filtres.")
            return

        last_update = filtered["date"].max()
        sdv_badge = filters_info["sdv_option"] if filters_info["sdv_option"] != "Tous" else "Toutes les options SDV"
        st.markdown(
            f"<span class='pill'>SDV : {sdv_badge}</span>"
            f"<span class='pill'>Période : {filters_info['period']}</span>"
            f"<span class='pill'>Dernière maj : {last_update:%d %b %Y}</span>",
            unsafe_allow_html=True,
        )

        metrics = compute_metrics(filtered)
        charts = build_charts(metrics)

        col_side, col_main = st.columns([0.9, 2.1], gap="large")
        with col_side:
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<p class='kpi-label'>Chauffeur sélectionné</p>", unsafe_allow_html=True)
            st.markdown(
                f"<div style='font-size:28px;font-weight:700;margin-bottom:20px;'>{filters_info['driver']}</div>",
                unsafe_allow_html=True,
            )
            st.markdown(
                f"<p style='margin:0 0 6px;opacity:0.9;'>Option: {sdv_badge}</p>",
                unsafe_allow_html=True,
            )
            st.markdown(
                f"<p style='margin:0 0 12px;opacity:0.9;'>Période: {filters_info['period']}</p>",
                unsafe_allow_html=True,
            )
            kpi_card("Total net", format_currency(metrics["total_net"]), f"Delta vs mois préc.: {format_number(metrics['delta_vs_prev'],1)} %" if pd.notna(metrics["delta_vs_prev"]) else "Variation indisponible")
            kpi_card("Net du mois courant", format_currency(metrics["current_net"]), metrics["last_month_label"])
            kpi_card("Montant facture", format_currency(metrics["total_amount"]), f"Marge nette: {format_number(metrics['net_margin'],1)} %")
            kpi_card("Charges (fuel + péage + dépenses)", format_currency(metrics["total_costs"]), f"Poids dans le CA: {format_number(metrics['cost_share'],1)} %")
            kpi_card("Voyages", format_number(metrics["trips"], 0), f"Net moyen: {format_currency(metrics['avg_net_trip'])}")
            kpi_card("Tonnage", f"{format_number(metrics['tonnage_total'],2)} T", f"Moyenne par voyage: {format_number(metrics['avg_ton_trip'],2)} T")
            st.markdown("</div>", unsafe_allow_html=True)

        with col_main:
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.subheader("Performance Mensuelle (Net)")
            st.caption("Calculé sur les lignes mensuelles des fichiers SDV.")
            st.plotly_chart(charts["net_trend"], use_container_width=True, config={"displayModeBar": False})
            stat_cols = st.columns(3)
            stat_cols[0].markdown(f"<div class='stat'><p class='title'>Dernier mois</p><p class='main'>{format_currency(metrics['last_month_net'])}</p></div>", unsafe_allow_html=True)
            delta_text = f"{format_number(metrics['delta_vs_prev'],1)} %" if pd.notna(metrics['delta_vs_prev']) else "N/A"
            stat_cols[1].markdown(f"<div class='stat'><p class='title'>Variation vs mois précédent</p><p class='main'>{delta_text}</p></div>", unsafe_allow_html=True)
            stat_cols[2].markdown(f"<div class='stat'><p class='title'>Mois actif</p><p class='main'>{metrics['last_month_label']}</p></div>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)

            row1 = st.columns(2, gap="medium")
            with row1[0]:
                st.markdown("<div class='card'>", unsafe_allow_html=True)
                st.subheader("Mix des charges")
                st.caption("Répartition fuel, péage et autres dépenses.")
                st.plotly_chart(charts["cost_donut"], use_container_width=True, config={"displayModeBar": False})
                st.markdown("</div>", unsafe_allow_html=True)
            with row1[1]:
                st.markdown("<div class='card'>", unsafe_allow_html=True)
                st.subheader("CA vs Net")
                st.caption("Comparaison montant facture et net par mois.")
                st.plotly_chart(charts["amount_net"], use_container_width=True, config={"displayModeBar": False})
                st.markdown("</div>", unsafe_allow_html=True)

            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.subheader("Voyages et tonnage")
            st.caption("Volume transporté et voyages mensuels.")
            st.plotly_chart(charts["tonnage_trips"], use_container_width=True, config={"displayModeBar": False})
            st.markdown("</div>", unsafe_allow_html=True)

    with data_tab:
        st.subheader("Controle qualite")
        if validation_report.empty:
            st.info("Aucun rapport de validation disponible.")
        else:
            st.dataframe(validation_report, use_container_width=True, hide_index=True)

        st.subheader("Données filtrées")
        data_view = filtered if "filtered" in locals() else df
        display_cols = [
            "sdv_option",
            "date",
            "date_iso",
            "day",
            "month",
            "year",
            "driver_name",
            "start",
            "destination",
            "amount_cfa",
            "fuel_cfa",
            "road_cfa",
            "expense_cfa",
            "charges_cfa",
            "net_cfa",
            "tonnage_t",
            "route_km",
            "source_file",
        ]
        display_cols = [c for c in display_cols if c in data_view.columns]
        st.dataframe(data_view[display_cols], use_container_width=True)
        csv_data = data_view.to_csv(index=False).encode("utf-8")
        st.download_button("Télécharger (CSV)", data=csv_data, file_name="donnees_filtrees.csv", mime="text/csv")


if __name__ == "__main__":
    main()
