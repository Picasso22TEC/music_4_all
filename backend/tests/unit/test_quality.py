"""Unit tests del mapeo de calidad API → tidalapi (app/core/quality.py)."""

from __future__ import annotations

import pytest
from tidalapi.media import Quality

from app.core.quality import extension_for, is_lossless, resolve_quality


class TestResolveQuality:
    @pytest.mark.parametrize(
        "api_quality, expected",
        [
            ("MASTER", Quality.hi_res_lossless),
            ("HIRES", Quality.hi_res_lossless),
            ("HIGH", Quality.high_lossless),
            ("NORMAL", Quality.low_320k),
            ("master", Quality.hi_res_lossless),  # case-insensitive
            ("normal", Quality.low_320k),
        ],
    )
    def test_known_values(self, api_quality: str, expected: Quality) -> None:
        assert resolve_quality(api_quality) is expected

    @pytest.mark.parametrize("api_quality", [None, "", "WEIRD", "flac"])
    def test_unknown_falls_back_to_lossless_default(self, api_quality) -> None:
        assert resolve_quality(api_quality) is Quality.hi_res_lossless


class TestFormatDecision:
    @pytest.mark.parametrize("api_quality", ["MASTER", "HIRES", "HIGH"])
    def test_lossless_tiers(self, api_quality: str) -> None:
        assert is_lossless(api_quality) is True
        assert extension_for(api_quality) == ".flac"

    def test_normal_is_lossy_m4a(self) -> None:
        assert is_lossless("NORMAL") is False
        assert extension_for("NORMAL") == ".m4a"

    @pytest.mark.parametrize("api_quality", [None, "", "WEIRD"])
    def test_unknown_is_treated_as_lossless(self, api_quality) -> None:
        # Debe ser coherente con resolve_quality (default hi_res_lossless).
        assert is_lossless(api_quality) is True
        assert extension_for(api_quality) == ".flac"
