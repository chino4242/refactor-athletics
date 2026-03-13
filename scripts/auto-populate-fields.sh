#!/bin/bash

# Script to auto-populate Epic and Release fields in GitHub Project based on issue labels

PROJECT_ID="PVT_kwHOAXs8pc4BRrsr"
REPO="chino4242/refactor-athletics"

echo "Fetching project field IDs..."

# Get field IDs for Epic and Release
FIELDS=$(gh api graphql -f query='
  query {
    node(id: "'$PROJECT_ID'") {
      ... on ProjectV2 {
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  }
')

echo "$FIELDS" > /tmp/project_fields.json
echo "✓ Fields fetched"

# You'll need to manually extract field IDs and option IDs from the JSON
# Then update issues based on their labels

echo ""
echo "Field data saved to /tmp/project_fields.json"
echo "Please check the file to get Epic and Release field IDs"
echo ""
echo "Next, we'll map labels to field values and update all issues"
