"""
Database migration script to create the conversations table.
Run this to add conversation tracking for LLM-powered SMS responses.
"""

from database import engine, Base
from models import Conversation
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Create conversations table"""
    try:
        logger.info("Creating conversations table...")
        Base.metadata.create_all(bind=engine, tables=[Conversation.__table__])
        logger.info("✅ Conversations table created successfully!")
        logger.info("Your database is now ready for LLM-powered conversation tracking.")
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate()
