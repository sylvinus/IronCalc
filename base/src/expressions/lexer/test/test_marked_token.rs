use crate::expressions::{
    lexer::marked_token::{get_tokens, MarkedToken},
    token::{OpCompare, OpSum, TokenType},
};

fn get_tokens_types(formula: &str) -> Vec<TokenType> {
    let marked_tokens = get_tokens(formula);
    marked_tokens.iter().map(|s| s.token.clone()).collect()
}

#[test]
fn test_get_tokens() {
    let formula = "1+1";
    let t = get_tokens(formula);
    assert_eq!(t.len(), 3);

    let formula = "1 +   AA23  +";
    let t = get_tokens(formula);
    assert_eq!(t.len(), 4);
    let l = t.get(2).expect("expected token");
    assert_eq!(l.start, 3);
    assert_eq!(l.end, 10);
}

#[test]
fn chinese_characters() {
    let formula = "\"你好\" & \"世界！\"";
    let marked_tokens = get_tokens(formula);
    assert_eq!(marked_tokens.len(), 3);
    let first_t = MarkedToken {
        token: TokenType::String("你好".to_string()),
        start: 0,
        end: 4,
    };
    let second_t = MarkedToken {
        token: TokenType::And,
        start: 4,
        end: 6,
    };
    let third_t = MarkedToken {
        token: TokenType::String("世界！".to_string()),
        start: 6,
        end: 12,
    };
    assert_eq!(marked_tokens, vec![first_t, second_t, third_t]);
}

#[test]
fn test_simple_tokens() {
    assert_eq!(
        get_tokens_types("()"),
        vec![TokenType::LeftParenthesis, TokenType::RightParenthesis]
    );
    assert_eq!(
        get_tokens_types("{}"),
        vec![TokenType::LeftBrace, TokenType::RightBrace]
    );
    assert_eq!(
        get_tokens_types("[]"),
        vec![TokenType::LeftBracket, TokenType::RightBracket]
    );
    assert_eq!(get_tokens_types("&"), vec![TokenType::And]);
    assert_eq!(
        get_tokens_types("<"),
        vec![TokenType::Compare(OpCompare::LessThan)]
    );
    assert_eq!(
        get_tokens_types(">"),
        vec![TokenType::Compare(OpCompare::GreaterThan)]
    );
    assert_eq!(
        get_tokens_types("<="),
        vec![TokenType::Compare(OpCompare::LessOrEqualThan)]
    );
    assert_eq!(
        get_tokens_types(">="),
        vec![TokenType::Compare(OpCompare::GreaterOrEqualThan)]
    );
    assert_eq!(
        get_tokens_types("IF"),
        vec![TokenType::Ident("IF".to_owned())]
    );
    assert_eq!(get_tokens_types("45"), vec![TokenType::Number(45.0)]);
    // The lexer parses this as two tokens
    assert_eq!(
        get_tokens_types("-45"),
        vec![TokenType::Addition(OpSum::Minus), TokenType::Number(45.0)]
    );
    assert_eq!(
        get_tokens_types("23.45e-2"),
        vec![TokenType::Number(23.45e-2)]
    );
    assert_eq!(
        get_tokens_types("4-3"),
        vec![
            TokenType::Number(4.0),
            TokenType::Addition(OpSum::Minus),
            TokenType::Number(3.0)
        ]
    );
    assert_eq!(get_tokens_types("True"), vec![TokenType::Boolean(true)]);
    assert_eq!(get_tokens_types("FALSE"), vec![TokenType::Boolean(false)]);
    assert_eq!(
        get_tokens_types("2,3.5"),
        vec![
            TokenType::Number(2.0),
            TokenType::Comma,
            TokenType::Number(3.5)
        ]
    );
    assert_eq!(
        get_tokens_types("2.4;3.5"),
        vec![
            TokenType::Number(2.4),
            TokenType::Semicolon,
            TokenType::Number(3.5)
        ]
    );
    assert_eq!(
        get_tokens_types("AB34"),
        vec![TokenType::Reference {
            sheet: None,
            row: 34,
            column: 28,
            absolute_column: false,
            absolute_row: false
        }]
    );
    assert_eq!(
        get_tokens_types("$A3"),
        vec![TokenType::Reference {
            sheet: None,
            row: 3,
            column: 1,
            absolute_column: true,
            absolute_row: false
        }]
    );
    assert_eq!(
        get_tokens_types("AB$34"),
        vec![TokenType::Reference {
            sheet: None,
            row: 34,
            column: 28,
            absolute_column: false,
            absolute_row: true
        }]
    );
    assert_eq!(
        get_tokens_types("$AB$34"),
        vec![TokenType::Reference {
            sheet: None,
            row: 34,
            column: 28,
            absolute_column: true,
            absolute_row: true
        }]
    );
    assert_eq!(
        get_tokens_types("'My House'!AB34"),
        vec![TokenType::Reference {
            sheet: Some("My House".to_string()),
            row: 34,
            column: 28,
            absolute_column: false,
            absolute_row: false
        }]
    );
}
