from app.news.sentiment import score


def test_chinese_positive_and_negative():
    assert score("台積電先進製程訂單滿載，營收創新高")[0] > 0.5
    assert score("面板需求疲弱，第四季營收年減")[0] < -0.5


def test_longest_match_and_negation():
    s, matched = score("聯電營收不如預期")
    assert s < 0 and matched == ["不如預期"]
    assert score("法人不看好下半年")[0] < 0


def test_english_and_neutral():
    assert score("Nvidia shares surge after earnings beat")[0] > 0.5
    assert score("Apple cuts forecast as demand slumps")[0] < -0.5
    assert score("台積電召開股東會")[0] == 0
