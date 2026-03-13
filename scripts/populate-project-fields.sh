#!/bin/bash

# Script to auto-populate Epic and Release fields based on issue labels

PROJECT_ID="PVT_kwHOAXs8pc4BRrsr"
EPIC_FIELD_ID="PVTSSF_lAHOAXs8pc4BRrsrzg_cI2s"
RELEASE_FIELD_ID="PVTSSF_lAHOAXs8pc4BRrsrzg_cJAE"
REPO="chino4242/refactor-athletics"

# Epic mappings (label -> option ID)
declare -A EPIC_MAP=(
  ["onboard"]="4f67cc50"
  ["character"]="9663eb72"
  ["training"]="07bc6c0c"
  ["tracking"]="489053ca"
  ["progression"]="ee55e8d4"
  ["party"]="635dccb1"
  ["story"]="2783dc56"
  ["combat"]="3b0c7740"
  ["compete"]="a160ac79"
)

# Release mappings (label -> option ID)
declare -A RELEASE_MAP=(
  ["mvp"]="e24d436f"
  ["v2"]="5b799550"
  ["future"]="438d4ee7"
)

echo "Fetching all project items..."

# Get all items in the project with their issue numbers
ITEMS=$(gh api graphql -f query='
  query {
    node(id: "'$PROJECT_ID'") {
      ... on ProjectV2 {
        items(first: 100) {
          nodes {
            id
            content {
              ... on Issue {
                number
                labels(first: 20) {
                  nodes {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
' --jq '.data.node.items.nodes[] | {id: .id, number: .content.number, labels: [.content.labels.nodes[].name]}')

echo "$ITEMS" | while IFS= read -r item; do
  ITEM_ID=$(echo "$item" | jq -r '.id')
  ISSUE_NUM=$(echo "$item" | jq -r '.number')
  LABELS=$(echo "$item" | jq -r '.labels[]')
  
  if [ -z "$ISSUE_NUM" ] || [ "$ISSUE_NUM" = "null" ]; then
    continue
  fi
  
  echo "Processing issue #$ISSUE_NUM..."
  
  # Set Epic based on label
  for label in $LABELS; do
    if [ -n "${EPIC_MAP[$label]}" ]; then
      echo "  Setting Epic to $label"
      gh api graphql -f query='
        mutation {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: "'$PROJECT_ID'"
              itemId: "'$ITEM_ID'"
              fieldId: "'$EPIC_FIELD_ID'"
              value: {
                singleSelectOptionId: "'${EPIC_MAP[$label]}'"
              }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
      ' > /dev/null
      break
    fi
  done
  
  # Set Release based on label
  for label in $LABELS; do
    if [ -n "${RELEASE_MAP[$label]}" ]; then
      RELEASE_NAME=$(echo "$label" | tr '[:lower:]' '[:upper:]')
      echo "  Setting Release to $RELEASE_NAME"
      gh api graphql -f query='
        mutation {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: "'$PROJECT_ID'"
              itemId: "'$ITEM_ID'"
              fieldId: "'$RELEASE_FIELD_ID'"
              value: {
                singleSelectOptionId: "'${RELEASE_MAP[$label]}'"
              }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
      ' > /dev/null
      break
    fi
  done
  
  sleep 0.5  # Rate limiting
done

echo ""
echo "✅ All items updated!"
echo "View your project: https://github.com/users/chino4242/projects/11"
