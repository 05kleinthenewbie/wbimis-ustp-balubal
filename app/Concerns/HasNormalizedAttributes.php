<?php

namespace App\Concerns;

trait HasNormalizedAttributes
{
    /** @var array<string, mixed> */
    protected array $normalizedChanges = [];

    /** @return list<string> */
    abstract protected function normalizedAttributeNames(): array;

    abstract protected function readNormalizedAttribute(string $key): mixed;

    /** @param array<string, mixed> $changes */
    abstract protected function persistNormalizedAttributes(array $changes): void;

    public static function bootHasNormalizedAttributes(): void
    {
        static::saved(function (self $model): void {
            if ($model->normalizedChanges !== []) {
                $model->persistNormalizedAttributes($model->normalizedChanges);
                $model->normalizedChanges = [];
            }
        });
    }

    public function getAttribute($key): mixed
    {
        if (in_array($key, $this->normalizedAttributeNames(), true)) {
            return array_key_exists($key, $this->normalizedChanges)
                ? $this->normalizedChanges[$key]
                : $this->readNormalizedAttribute($key);
        }

        return parent::getAttribute($key);
    }

    public function setAttribute($key, $value): static
    {
        if (in_array($key, $this->normalizedAttributeNames(), true)) {
            $this->normalizedChanges[$key] = $value;

            return $this;
        }

        return parent::setAttribute($key, $value);
    }

    public function attributesToArray(): array
    {
        $attributes = parent::attributesToArray();
        foreach ($this->normalizedAttributeNames() as $key) {
            $attributes[$key] = $this->getAttribute($key);
        }

        return $attributes;
    }

    /** @param array<string, mixed> $options */
    public function save(array $options = []): bool
    {
        return $this->getConnection()->transaction(function () use ($options): bool {
            if ($this->exists) {
                $this->newModelQuery()->whereKey($this->getKey())->lockForUpdate()->value($this->getKeyName());
            }

            return parent::save($options);
        });
    }
}
