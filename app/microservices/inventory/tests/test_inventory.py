from .conftest import TEST_INTERNAL_TOKEN

HEADERS = {"X-Internal-Token": TEST_INTERNAL_TOKEN}


async def test_untracked_ref_is_available(client):
    response = await client.get("/availability", params={"refs": "VW-158"})
    assert response.status_code == 200
    assert response.json() == [{"ref": "VW-158", "status": "available"}]


async def test_stock_endpoints_require_internal_token(client):
    assert (await client.get("/stock")).status_code == 401
    assert (await client.patch("/stock/VW-158", json={"quantity": 5})).status_code == 401
    assert (await client.post("/stock/reserve", json={"order_code": "SI-1", "items": []})).status_code in (
        401,
        422,
    )
    assert (await client.post("/stock/release", json={"order_code": "SI-1"})).status_code == 401
    assert (await client.get("/movements")).status_code == 401
    assert (await client.get("/summary")).status_code == 401


async def test_patch_stock_sets_quantity_and_records_movement(client):
    response = await client.patch("/stock/VW-158", json={"quantity": 10}, headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["quantity"] == 10
    assert body["tracked"] is True
    assert body["status"] == "available"

    movements = await client.get("/movements", params={"ref": "VW-158"}, headers=HEADERS)
    assert movements.status_code == 200
    assert movements.json()[0]["delta"] == 10
    assert movements.json()[0]["reason"] == "adjust"


async def test_low_stock_status(client):
    await client.patch(
        "/stock/VW-158", json={"quantity": 3, "low_stock_threshold": 5}, headers=HEADERS
    )
    response = await client.get("/availability", params={"refs": "VW-158"})
    assert response.json() == [{"ref": "VW-158", "status": "low"}]


async def test_out_of_stock_status(client):
    await client.patch("/stock/VW-158", json={"quantity": 0}, headers=HEADERS)
    response = await client.get("/availability", params={"refs": "VW-158"})
    assert response.json() == [{"ref": "VW-158", "status": "out"}]


async def test_patch_quantity_null_makes_ref_untracked(client):
    await client.patch("/stock/VW-158", json={"quantity": 10}, headers=HEADERS)
    response = await client.patch("/stock/VW-158", json={"quantity": None}, headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["tracked"] is False
    assert response.json()["status"] == "available"


async def test_reserve_is_all_or_nothing(client):
    await client.patch("/stock/VW-158", json={"quantity": 1}, headers=HEADERS)

    response = await client.post(
        "/stock/reserve",
        json={"order_code": "SI-000010", "items": [{"ref": "VW-158", "quantity": 2}, {"ref": "LN-74", "quantity": 1}]},
        headers=HEADERS,
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]
    assert body["refs"] == ["VW-158"]

    stock = await client.get("/availability", params={"refs": "VW-158"})
    assert stock.json() == [{"ref": "VW-158", "status": "low"}]


async def test_reserve_decrements_tracked_stock_only(client):
    await client.patch("/stock/VW-158", json={"quantity": 10}, headers=HEADERS)

    response = await client.post(
        "/stock/reserve",
        json={
            "order_code": "SI-000011",
            "items": [{"ref": "VW-158", "quantity": 2}, {"ref": "LN-74", "quantity": 3}],
        },
        headers=HEADERS,
    )
    assert response.status_code == 200

    tracked = await client.get("/availability", params={"refs": "VW-158"})
    assert tracked.json()[0]["status"] == "available"

    stock_list = await client.get("/stock", headers=HEADERS)
    vw = next(item for item in stock_list.json()["items"] if item["ref"] == "VW-158")
    assert vw["quantity"] == 8

    untracked = await client.get("/availability", params={"refs": "LN-74"})
    assert untracked.json()[0]["status"] == "available"


async def test_release_restores_quantity_and_is_idempotent(client):
    await client.patch("/stock/VW-158", json={"quantity": 10}, headers=HEADERS)
    await client.post(
        "/stock/reserve",
        json={"order_code": "SI-000010", "items": [{"ref": "VW-158", "quantity": 2}]},
        headers=HEADERS,
    )

    first_release = await client.post("/stock/release", json={"order_code": "SI-000010"}, headers=HEADERS)
    assert first_release.status_code == 200

    second_release = await client.post("/stock/release", json={"order_code": "SI-000010"}, headers=HEADERS)
    assert second_release.status_code == 200

    stock_list = await client.get("/stock", headers=HEADERS)
    vw = next(item for item in stock_list.json()["items"] if item["ref"] == "VW-158")
    assert vw["quantity"] == 10


async def test_stock_list_filters_by_status_and_paginates(client):
    await client.patch("/stock/A-1", json={"quantity": 0}, headers=HEADERS)
    await client.patch("/stock/A-2", json={"quantity": 3, "low_stock_threshold": 5}, headers=HEADERS)
    await client.patch("/stock/A-3", json={"quantity": 20}, headers=HEADERS)
    await client.patch("/stock/A-4", json={"quantity": None}, headers=HEADERS)
    await client.patch("/stock/A-4", json={"low_stock_threshold": 5}, headers=HEADERS)

    out = await client.get("/stock", params={"status": "out"}, headers=HEADERS)
    assert [item["ref"] for item in out.json()["items"]] == ["A-1"]

    low = await client.get("/stock", params={"status": "low"}, headers=HEADERS)
    assert [item["ref"] for item in low.json()["items"]] == ["A-2"]

    untracked = await client.get("/stock", params={"status": "untracked"}, headers=HEADERS)
    assert [item["ref"] for item in untracked.json()["items"]] == ["A-4"]

    page = await client.get("/stock", params={"limit": 1, "offset": 1}, headers=HEADERS)
    assert page.json()["total"] == 4
    assert len(page.json()["items"]) == 1


async def test_summary_counts_tracked_low_and_out(client):
    await client.patch("/stock/A-1", json={"quantity": 0}, headers=HEADERS)
    await client.patch("/stock/A-2", json={"quantity": 3, "low_stock_threshold": 5}, headers=HEADERS)
    await client.patch("/stock/A-3", json={"quantity": 20}, headers=HEADERS)

    response = await client.get("/summary", headers=HEADERS)
    body = response.json()
    assert body["tracked"] == 3
    assert body["low"] == 1
    assert body["out"] == 1


async def test_patch_stock_rejects_negative_quantity(client):
    response = await client.patch("/stock/VW-158", json={"quantity": -1}, headers=HEADERS)
    assert response.status_code == 422
    assert "error" in response.json()
